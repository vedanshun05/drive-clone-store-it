/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Exercise the real actions with isolated Appwrite/Next adapters, without a DB.
function loadActions(relativePath, mocks) {
  const filename = resolve(__dirname, "..", relativePath);
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled.require = (id) =>
    Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  compiled._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return compiled.exports;
}

const config = {
  databaseId: "db",
  usersTableId: "users",
  filesTableId: "files",
  bucketId: "bucket",
};
const constants = {
  MAX_FILE_SIZE: 4 * 1024 * 1024,
  sortTypes: [{ value: "$createdAt-desc" }],
};
const utils = {
  parseStringify: (value) => JSON.parse(JSON.stringify(value)),
  constructFileUrl: (id) => `https://example.com/${id}`,
  getFileType: () => ({ type: "document", extension: "txt" }),
};

function fileHarness({
  user = { $id: "owner", accountId: "account", email: "owner@example.com" },
  owner = "owner",
  rows = [],
  storageError,
} = {}) {
  const calls = [];
  const tablesDB = {
    getRow: async (args) => {
      calls.push(["getRow", args]);
      return {
        $id: "file",
        owner,
        extension: "txt",
        bucketFileId: "real-bucket-file",
      };
    },
    updateRow: async (args) => {
      calls.push(["updateRow", args]);
      return args.data;
    },
    createRow: async (args) => {
      calls.push(["createRow", args]);
      return args.data;
    },
    deleteRow: async (args) => {
      calls.push(["deleteRow", args]);
    },
    listRows: async (args) => {
      calls.push(["listRows", args]);
      const queries = args.queries.map((query) => JSON.parse(query));
      const limit =
        queries.find((query) => query.method === "limit")?.values[0] ?? 25;
      const cursor = queries.find((query) => query.method === "cursorAfter")
        ?.values[0];
      const start = cursor
        ? rows.findIndex((row) => row.$id === cursor) + 1
        : 0;
      return { total: rows.length, rows: rows.slice(start, start + limit) };
    },
  };
  const storage = {
    createFile: async (args) => {
      calls.push(["createFile", args]);
      return { $id: "uploaded", name: "example.txt", sizeOriginal: 3 };
    },
    deleteFile: async (args) => {
      calls.push(["deleteFile", args]);
      if (storageError) throw storageError;
    },
  };
  const actions = loadActions("lib/actions/file.actions.ts", {
    "@/lib/appwrite": {
      createAdminClient: async () => {
        calls.push(["admin"]);
        return { tablesDB, storage };
      },
    },
    "@/lib/appwrite/config": { appwriteConfig: config },
    "@/lib/actions/user.actions": { getCurrentUser: async () => user },
    "@/constants": constants,
    "@/lib/utils": utils,
    "next/cache": { revalidatePath: () => {} },
  });
  return { actions, calls };
}

const mutationArgs = {
  uploadFile: {
    file: new File(["abc"], "example.txt"),
    ownerId: "forged",
    accountId: "forged",
    path: "/",
  },
  renameFile: {
    fileId: "file",
    name: "example.txt",
    extension: "exe",
    path: "/",
  },
  updateFileUsers: {
    fileId: "file",
    emails: ["friend@example.com"],
    path: "/",
  },
  deleteFile: { fileId: "file", bucketFileId: "forged-bucket-file", path: "/" },
};

for (const [name, args] of Object.entries(mutationArgs)) {
  test(`${name} requires a session before accessing Appwrite`, async () => {
    const { actions, calls } = fileHarness({ user: null });
    await assert.rejects(actions[name](args), /not authenticated/);
    assert.equal(calls.length, 0);
  });
  if (name !== "uploadFile") {
    test(`${name} rejects a different file owner`, async () => {
      const { actions, calls } = fileHarness({ owner: "someone-else" });
      await assert.rejects(actions[name](args), /do not own/);
      assert.equal(
        calls.some(([operation]) =>
          ["updateRow", "deleteRow", "deleteFile"].includes(operation),
        ),
        false,
      );
    });
  }
}

test("uploads derive identity from the session rather than submitted IDs", async () => {
  const { actions, calls } = fileHarness();
  await actions.uploadFile(mutationArgs.uploadFile);
  const row = calls.find(([operation]) => operation === "createRow")[1].data;
  assert.equal(row.owner, "owner");
  assert.equal(row.accountId, "account");
});

test("oversized uploads are rejected before any storage write", async () => {
  const { actions, calls } = fileHarness();
  await assert.rejects(
    actions.uploadFile({
      ...mutationArgs.uploadFile,
      file: new File(
        [new Uint8Array(constants.MAX_FILE_SIZE + 1)],
        "large.bin",
      ),
    }),
    /4 MB/,
  );
  assert.equal(calls.length, 0);
});

test("renaming preserves the stored extension without duplicating it", async () => {
  const { actions } = fileHarness({ owner: { $id: "owner" } });
  assert.equal(
    (await actions.renameFile(mutationArgs.renameFile)).name,
    "example.txt",
  );
  assert.equal(
    (await actions.renameFile({ ...mutationArgs.renameFile, name: "renamed" }))
      .name,
    "renamed.txt",
  );
});

test("deletion uses the stored bucket ID and removes storage before metadata", async () => {
  const { actions, calls } = fileHarness();
  await actions.deleteFile(mutationArgs.deleteFile);
  assert.equal(
    calls.find(([operation]) => operation === "deleteFile")[1].fileId,
    "real-bucket-file",
  );
  assert.ok(
    calls.findIndex(([op]) => op === "deleteFile") <
      calls.findIndex(([op]) => op === "deleteRow"),
  );
});

test("failed storage deletion keeps metadata for a retry", async () => {
  const { actions, calls } = fileHarness({
    storageError: Object.assign(new Error("storage unavailable"), {
      code: 503,
    }),
  });
  await assert.rejects(
    actions.deleteFile(mutationArgs.deleteFile),
    /storage unavailable/,
  );
  assert.equal(
    calls.some(([operation]) => operation === "deleteRow"),
    false,
  );
});

test("missing storage objects still allow stale metadata to be removed", async () => {
  const { actions, calls } = fileHarness({
    storageError: Object.assign(new Error("missing"), { code: 404 }),
  });
  await actions.deleteFile(mutationArgs.deleteFile);
  assert.equal(
    calls.some(([operation]) => operation === "deleteRow"),
    true,
  );
});

test("sharing validates, normalizes, and deduplicates email addresses", async () => {
  const { actions } = fileHarness();
  const result = await actions.updateFileUsers({
    ...mutationArgs.updateFileUsers,
    emails: [" Friend@Example.com ", "friend@example.com", ""],
  });
  assert.deepEqual(result.users, ["friend@example.com"]);
  await assert.rejects(
    actions.updateFileUsers({
      ...mutationArgs.updateFileUsers,
      emails: ["invalid"],
    }),
  );
});

const manyRows = Array.from({ length: 125 }, (_, index) => ({
  $id: `file-${index}`,
  type: "document",
  size: 10,
  $updatedAt: "2026-01-01T00:00:00Z",
}));

test("file listings include rows beyond Appwrite's default page", async () => {
  const { actions } = fileHarness({ rows: manyRows });
  const files = await actions.getFiles();
  assert.equal(files.rows.length, 125);
  assert.equal(files.total, 125);
});

test("storage usage includes every page", async () => {
  const { actions } = fileHarness({ rows: manyRows });
  const usage = await actions.getTotalSpaceUsed();
  assert.equal(usage.used, 1250);
  assert.equal(usage.document.size, 1250);
});

test("recent-file queries honor their explicit limit", async () => {
  const { actions, calls } = fileHarness({ rows: manyRows });
  assert.equal((await actions.getFiles({ limit: 10 })).rows.length, 10);
  assert.equal(
    calls.filter(([operation]) => operation === "listRows").length,
    1,
  );
});

function userHarness({ cookie = true, accountError } = {}) {
  const calls = [];
  const account = {
    createEmailToken: async () => ({ userId: "actual-token-account" }),
    createSession: async () => ({
      $id: "session",
      secret: "secret",
      expire: "2027-01-01T00:00:00Z",
    }),
    get: async () => {
      if (accountError) throw accountError;
      return { $id: "actual-token-account" };
    },
    deleteSession: async () => {
      if (accountError) throw accountError;
    },
  };
  const actions = loadActions("lib/actions/user.actions.ts", {
    "@/lib/appwrite": {
      createAdminClient: async () => ({
        account,
        tablesDB: {
          listRows: async () => ({
            total: 1,
            rows: [{ accountId: "stale-account" }],
          }),
        },
      }),
      createSessionClient: async () => ({ account }),
    },
    "@/lib/appwrite/config": { appwriteConfig: config },
    "@/lib/utils": utils,
    "@/constants": { avatarPlaceholderUrl: "https://example.com/avatar.png" },
    "next/headers": {
      cookies: async () => ({
        get: () => (cookie ? { value: "session" } : undefined),
        set: (...args) => calls.push(["cookie", ...args]),
        delete: (...args) => calls.push(["delete-cookie", ...args]),
      }),
    },
    "next/navigation": {
      redirect: (path) => {
        throw new Error(`redirect:${path}`);
      },
    },
  });
  return { actions, calls };
}

test("sign-in verifies against the account ID returned with the OTP", async () => {
  const { actions } = userHarness();
  assert.equal(
    (await actions.signInUser({ email: " Owner@Example.com " })).accountId,
    "actual-token-account",
  );
});

test("session cookies are HTTP-only and expire with the Appwrite session", async () => {
  const { actions, calls } = userHarness();
  await actions.verifySecret({ accountId: "account", password: "123456" });
  const options = calls.find(([operation]) => operation === "cookie")[3];
  assert.equal(options.httpOnly, true);
  assert.equal(options.expires.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(options.secure, process.env.NODE_ENV === "production");
});

test("anonymous and expired sessions return no user", async () => {
  assert.equal(
    await userHarness({ cookie: false }).actions.getCurrentUser(),
    null,
  );
  assert.equal(
    await userHarness({ accountError: { code: 401 } }).actions.getCurrentUser(),
    null,
  );
});

test("backend outages are not silently treated as signed-out sessions", async () => {
  await assert.rejects(
    userHarness({
      accountError: new Error("backend unavailable"),
    }).actions.getCurrentUser(),
    /backend unavailable/,
  );
});

test("sign-out clears the local cookie even if session revocation fails", async () => {
  const { actions, calls } = userHarness({
    accountError: new Error("expired"),
  });
  await assert.rejects(actions.signOutUser(), /redirect:\/sign-in/);
  assert.equal(
    calls.some(([operation]) => operation === "delete-cookie"),
    true,
  );
});
