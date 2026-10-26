/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = resolve(__dirname, "../lib/search.ts");
const compiled = new Module(filename, module);
compiled.paths = module.paths;
compiled._compile(
  ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const { createFileSearchIndex } = compiled.exports;
const files = [
  { name: "Project brief.txt" },
  { name: "Brand palette.png" },
  { name: "Annual financial report.pdf" },
  { name: "Audio sample.wav" },
];

test("fuzzy search tolerates missing letters and ranks the intended filename first", () => {
  const index = createFileSearchIndex(files);
  assert.equal(index.search("projct brief")[0].item.name, "Project brief.txt");
  assert.equal(index.search("brief projct")[0].item.name, "Project brief.txt");
  assert.equal(index.search("brnad palette")[0].item.name, "Brand palette.png");
});

test("filename search is case-insensitive and matches text at the end of long names", () => {
  const index = createFileSearchIndex([
    ...files,
    { name: "a".repeat(90) + " unique-suffix.pdf" },
  ]);
  assert.equal(
    index.search("ANNUAL FINANCIAL")[0].item.name,
    "Annual financial report.pdf",
  );
  assert.ok(
    index.search("unique-suffix")[0].item.name.endsWith("unique-suffix.pdf"),
  );
});

test("empty/unrelated queries have no results and requested result limits are honored", () => {
  const index = createFileSearchIndex(
    Array.from({ length: 30 }, (_, i) => ({ name: `Project report ${i}.pdf` })),
  );
  assert.equal(index.search("").length, 0);
  assert.equal(index.search("zzzzzzzzzzzzzz").length, 0);
  assert.equal(index.search("project", { limit: 10 }).length, 10);
});
