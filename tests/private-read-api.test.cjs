/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(path, actionName, action) {
  const filename = resolve(__dirname, "..", path);
  const compiled = new Module(filename, module);
  compiled.paths = module.paths;
  compiled.require = () => ({ [actionName]: action });
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
for (const [endpoint, actionName, data] of [
  ["search", "getFileSearchIndex", [{ name: "Brief.txt" }]],
  [
    "notifications",
    "getShareNotifications",
    { notifications: [], unreadCount: 0 },
  ],
]) {
  test(`${endpoint} API returns authenticated data without public caching`, async () => {
    const route = load(
      `app/api/${endpoint}/route.ts`,
      actionName,
      async () => data,
    );
    const response = await route.GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(await response.json(), data);
  });
  test(`${endpoint} API rejects anonymous requests`, async () => {
    const route = load(`app/api/${endpoint}/route.ts`, actionName, async () => {
      throw new Error("User is not authenticated.");
    });
    assert.equal((await route.GET()).status, 401);
  });
  test(`${endpoint} API reports temporary failures without exposing backend messages`, async () => {
    const route = load(`app/api/${endpoint}/route.ts`, actionName, async () => {
      throw new Error("private backend detail");
    });
    const response = await route.GET();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.ok(!(await response.text()).includes("private backend detail"));
  });
}
