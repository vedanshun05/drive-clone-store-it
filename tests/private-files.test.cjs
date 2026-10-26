/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function harness({
  user = { $id: "owner", email: "owner@example.com" },
  allowed = true,
  mimeType = "image/png",
  name = "photo.png",
  error,
} = {}) {
  const calls = [];
  const filename = resolve(__dirname, "../app/api/files/[fileId]/route.ts");
  const compiled = new Module(filename, module);
  compiled.paths = module.paths;
  const mocks = {
    "@/lib/appwrite/config": {
      appwriteConfig: {
        databaseId: "db",
        filesTableId: "files",
        bucketId: "bucket",
      },
    },
    "@/lib/actions/user.actions": { getCurrentUser: async () => user },
    "@/lib/appwrite": {
      createAdminClient: async () => {
        calls.push(["admin"]);
        return {
          tablesDB: {
            listRows: async (args) => {
              calls.push(["listRows", args]);
              return { rows: allowed ? [{ name }] : [] };
            },
          },
          storage: {
            getFile: async () => {
              calls.push(["getFile"]);
              if (error) throw error;
              return { name, mimeType };
            },
            getFileView: async () => {
              calls.push(["getFileView"]);
              return new Uint8Array([1, 2, 3]).buffer;
            },
          },
        };
      },
    },
  };
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
  const get = (query = "", fileId = "file-1") =>
    compiled.exports.GET(
      new Request(`https://example.com/api/files/${fileId}${query}`),
      { params: Promise.resolve({ fileId }) },
    );
  return { get, calls };
}

test("anonymous file requests do not touch storage or metadata", async () => {
  const { get, calls } = harness({ user: null });
  const response = await get();
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(calls.length, 0);
});

test("unshared files are hidden and never fetched from storage", async () => {
  const { get, calls } = harness({ allowed: false });
  assert.equal((await get()).status, 404);
  assert.equal(
    calls.some(([name]) => name === "getFile"),
    false,
  );
});

test("the metadata query checks both bucket ID and authenticated owner/shared email", async () => {
  const { get, calls } = harness();
  await get();
  const queries = calls
    .find(([name]) => name === "listRows")[1]
    .queries.map(JSON.parse);
  assert.ok(
    queries.some(
      (query) =>
        query.attribute === "bucketFileId" && query.values[0] === "file-1",
    ),
  );
  const acl = queries.find((query) => query.method === "or").values;
  assert.ok(
    acl.some(
      (query) => query.attribute === "owner" && query.values[0] === "owner",
    ),
  );
  assert.ok(
    acl.some(
      (query) =>
        query.attribute === "users" && query.values[0] === "owner@example.com",
    ),
  );
});

test("authorized images are served inline without public caching", async () => {
  const response = await harness().get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("content-disposition"), /^inline;/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(
    [...new Uint8Array(await response.arrayBuffer())],
    [1, 2, 3],
  );
});

test("download URLs use attachment disposition", async () => {
  assert.match(
    (await harness().get("?download=1")).headers.get("content-disposition"),
    /^attachment;/,
  );
});

test("native audio previews can load same-origin media while uploaded scripts remain blocked", async () => {
  const response = await harness({ mimeType: "audio/x-wav" }).get();
  const policy = response.headers.get("content-security-policy");
  assert.match(policy, /media-src 'self'/);
  assert.match(policy, /script-src 'none'/);
  assert.equal(policy.includes("sandbox"), false);
});

for (const mimeType of [
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
]) {
  test(`${mimeType} cannot execute as an inline same-origin document`, async () => {
    const response = await harness({ mimeType }).get();
    assert.match(response.headers.get("content-disposition"), /^attachment;/);
    assert.match(response.headers.get("content-security-policy"), /sandbox/);
  });
}

test("untrusted file names cannot inject response headers", async () => {
  const response = await harness({
    name: 'résumé"\r\nInjected: yes.pdf',
  }).get();
  assert.equal(response.status, 200);
  const disposition = response.headers.get("content-disposition");
  assert.equal(/[\r\n]/.test(disposition), false);
  assert.match(disposition, /filename\*=UTF-8''r%C3%A9sum%C3%A9/);
  assert.equal(response.headers.get("Injected"), null);
});

test("invalid file IDs stop before metadata access", async () => {
  const { get, calls } = harness();
  assert.equal((await get("", "invalid/id")).status, 404);
  assert.equal(calls.length, 0);
});

test("missing storage objects return private 404 responses", async () => {
  const response = await harness({ error: { code: 404 } }).get();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
