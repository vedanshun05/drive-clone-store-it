/* eslint @typescript-eslint/no-require-imports: "off" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = resolve(__dirname, "../lib/utils.ts");
const compiled = new Module(filename, module);
compiled.paths = module.paths;
compiled._compile(
  ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const utils = compiled.exports;

for (const filename of ["README", ".env", "notes."]) {
  test(`extensionless name ${filename} keeps an empty extension`, () => {
    assert.deepEqual(utils.getFileType(filename), {
      type: "other",
      extension: "",
    });
  });
}
for (const [filename, type, extension] of [
  ["photo.PNG", "image", "png"],
  ["song.M4A", "audio", "m4a"],
  ["movie.wmv", "video", "wmv"],
  ["slides.pptx", "document", "pptx"],
]) {
  test(`${filename} is categorized as ${type}`, () => {
    assert.deepEqual(utils.getFileType(filename), { type, extension });
  });
}

test("storage usage produces the correct half-circle angle", () => {
  assert.equal(utils.calculatePercentage(1024 ** 3), 50);
  assert.equal(utils.calculateAngle(1024 ** 3), 180);
  assert.equal(utils.convertFileSize(0), "0 Bytes");
});

test("file URLs route through application authorization", () => {
  assert.equal(utils.constructFileUrl("file-1"), "/api/files/file-1");
  assert.equal(
    utils.constructDownloadUrl("file-1"),
    "/api/files/file-1?download=1",
  );
});

test("server and browser timestamps use an explicit, consistent UTC representation", () => {
  assert.equal(
    utils.formatDateTime("2026-10-26T04:09:00.000Z"),
    "4:09am UTC, 26 Oct 2026",
  );
  assert.equal(utils.formatDateTime("invalid"), "—");
});

test("rename drafts exclude only the stored extension", () => {
  assert.equal(utils.getFileBaseName("archive.tar.zip", "zip"), "archive.tar");
  assert.equal(utils.getFileBaseName("photo.PNG", "png"), "photo");
  assert.equal(utils.getFileBaseName("README", ""), "README");
  assert.equal(utils.getFileBaseName(".env", ""), ".env");
  assert.equal(utils.getFileBaseName("mismatched", "txt"), "mismatched");
});
