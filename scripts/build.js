import { spawnSync } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { extensionFiles } from "./package-files.js";

await mkdir("dist", { recursive: true });
await rm("dist/google-calendar-slots", { recursive: true, force: true });
await mkdir("dist/google-calendar-slots", { recursive: true });
for (const file of extensionFiles) {
  await copyFile(`extension/${file}`, `dist/google-calendar-slots/${file}`);
}
await copyFile("LICENSE", "dist/google-calendar-slots/LICENSE");
await rm("dist/google-calendar-slots.zip", { force: true });
const result = spawnSync(
  "zip",
  ["-q", "../google-calendar-slots.zip", ...extensionFiles, "LICENSE"],
  { cwd: "dist/google-calendar-slots", stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
console.log("dist/google-calendar-slots.zip を作成しました。");
