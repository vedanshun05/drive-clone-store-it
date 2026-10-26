/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(path, mocks) {
  const filename = resolve(__dirname, "..", path);
  const compiled = new Module(filename, module);
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
  filesTableId: "files",
  notificationsTableId: "notifications",
};
const email = "recipient@example.com";
const id = "a".repeat(32);
function harness({
  user = { $id: "recipient", email },
  entries = [],
  files = [],
  rowRecipient = email,
  failWrite = false,
} = {}) {
  const calls = [];
  const tablesDB = {
    upsertRow: async (args) => {
      calls.push(["upsert", args]);
      if (failWrite) throw Error("unavailable");
      return args.data;
    },
    getRow: async (args) => {
      calls.push(["get", args]);
      return { recipient: rowRecipient };
    },
    updateRow: async (args) => {
      calls.push(["update", args]);
      return args.data;
    },
    listRows: async (args) => {
      calls.push(["list", args]);
      if (args.tableId === "files") return { rows: files, total: files.length };
      const queries = args.queries.map((q) => JSON.parse(q));
      const cursor = queries.find((q) => q.method === "cursorAfter")?.values[0];
      const start = cursor
        ? entries.findIndex((row) => row.$id === cursor) + 1
        : 0;
      return { rows: entries.slice(start, start + 100), total: entries.length };
    },
  };
  const mocks = {
    "server-only": {},
    "@/lib/appwrite": {
      createAdminClient: async () => {
        calls.push(["admin"]);
        return { tablesDB };
      },
    },
    "@/lib/appwrite/config": { appwriteConfig: config },
    "@/lib/actions/user.actions": { getCurrentUser: async () => user },
    "@/lib/utils": { constructFileUrl: (fileId) => `/api/files/${fileId}` },
  };
  return {
    calls,
    prepare: load("lib/notifications.ts", mocks),
    actions: load("lib/actions/notification.actions.ts", mocks),
  };
}
const entry = {
  $id: id,
  fileId: "file",
  recipient: email,
  read: false,
  eventAt: "2026-10-26T10:00:00Z",
};
const sharedFile = {
  $id: "file",
  name: "Brief.txt",
  owner: { $id: "owner", fullName: "Owner" },
  bucketFileId: "storage",
};

test("only newly added recipients get notifications; unchanged saves and self-shares do not", async () => {
  const h = harness();
  await h.prepare.prepareShareNotifications(
    {
      $id: "file",
      users: ["existing@example.com"],
      owner: { email: "owner@example.com" },
    },
    ["existing@example.com", "owner@example.com", email],
  );
  const writes = h.calls.filter(([op]) => op === "upsert");
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1].data.recipient, email);
  assert.equal(writes[0][1].data.read, false);
  assert.equal(
    writes[0][1].rowId,
    h.prepare.shareNotificationId("file", email),
  );
  assert.notEqual(
    writes[0][1].rowId,
    h.prepare.shareNotificationId("other", email),
  );
  h.calls.length = 0;
  await h.prepare.prepareShareNotifications({ $id: "file", users: [email] }, [
    email,
  ]);
  assert.equal(h.calls.length, 0);
});

test("re-sharing uses the same inbox row and resets it to unread", async () => {
  const h = harness();
  await h.prepare.prepareShareNotifications({ $id: "file", users: [] }, [
    email,
  ]);
  await h.prepare.prepareShareNotifications({ $id: "file", users: [] }, [
    email,
  ]);
  const writes = h.calls.filter(([op]) => op === "upsert");
  assert.equal(writes[0][1].rowId, writes[1][1].rowId);
  assert.equal(writes[1][1].data.read, false);
});

test("notification preparation failures propagate before a share is granted", async () => {
  const h = harness({ failWrite: true });
  await assert.rejects(
    h.prepare.prepareShareNotifications({ $id: "file" }, [email]),
    /unavailable/,
  );
});

for (const action of [
  "getShareNotifications",
  "markShareNotificationRead",
  "markAllShareNotificationsRead",
])
  test(`${action} requires authentication before database access`, async () => {
    const h = harness({ user: null });
    await assert.rejects(h.actions[action](id), /not authenticated/);
    assert.equal(h.calls.length, 0);
  });

test("inbox resolves current file access and returns only safe presentation fields", async () => {
  const h = harness({ entries: [entry], files: [sharedFile] });
  const inbox = await h.actions.getShareNotifications();
  assert.equal(inbox.unreadCount, 1);
  assert.deepEqual(inbox.notifications[0], {
    id,
    fileName: "Brief.txt",
    ownerName: "Owner",
    url: "/api/files/storage",
    eventAt: entry.eventAt,
    read: false,
  });
  const lists = h.calls.filter(([op]) => op === "list");
  assert.ok(
    lists[0][1].queries.some((q) => {
      const p = JSON.parse(q);
      return p.attribute === "recipient" && p.values.includes(email);
    }),
  );
  assert.ok(
    lists[1][1].queries.some((q) => {
      const p = JSON.parse(q);
      return p.attribute === "users" && p.values.includes(email);
    }),
  );
});

test("revoked or deleted files disappear even when their old notification remains", async () => {
  const h = harness({ entries: [entry], files: [] });
  assert.deepEqual(await h.actions.getShareNotifications(), {
    notifications: [],
    unreadCount: 0,
  });
});

test("reading someone else's notification cannot change its state", async () => {
  const h = harness({ rowRecipient: "someone@example.com" });
  await assert.rejects(h.actions.markShareNotificationRead(id), /not found/);
  assert.equal(
    h.calls.some(([op]) => op === "update"),
    false,
  );
});

test("read acknowledgement changes only the read flag", async () => {
  const h = harness();
  await h.actions.markShareNotificationRead(id);
  assert.deepEqual(h.calls.find(([op]) => op === "update")[1].data, {
    read: true,
  });
});

test("mark-all handles every page and only writes unread recipient rows", async () => {
  const entries = Array.from({ length: 101 }, (_, i) => ({
    ...entry,
    $id: String(i).padStart(32, "0"),
    read: i === 0,
  }));
  const h = harness({ entries });
  await h.actions.markAllShareNotificationsRead();
  assert.equal(h.calls.filter(([op]) => op === "list").length, 2);
  assert.equal(h.calls.filter(([op]) => op === "update").length, 100);
  assert.ok(
    h.calls
      .filter(([op]) => op === "list")
      .every(([, args]) =>
        args.queries.some((q) => {
          const p = JSON.parse(q);
          return p.attribute === "recipient" && p.values.includes(email);
        }),
      ),
  );
});
