import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { extensionFiles } from "./package-files.js";

for (const directory of ["extension", "scripts", "tests"]) {
  for (const name of await readdir(directory)) {
    if (!name.endsWith(".js")) continue;
    const result = spawnSync(
      process.execPath,
      ["--check", `${directory}/${name}`],
      { stdio: "inherit" },
    );
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
const metadata = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, metadata.version);
assert.equal(manifest.name, "Google Calendar Slots");
assert.deepEqual(
  (await readdir("extension")).sort(),
  [...extensionFiles].sort(),
  "配布対象外のファイルがextension内にあります。",
);
assert.deepEqual(manifest.permissions, [
  "activeTab",
  "scripting",
  "clipboardWrite",
  "storage",
]);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.content_scripts, undefined);
for (const file of [
  manifest.background.service_worker,
  manifest.options_ui.page,
  "core.js",
  "reader.js",
  "content.js",
]) {
  await readFile(`extension/${file}`);
}
console.log("JavaScript構文・manifest・参照ファイルの検証に成功しました。");
