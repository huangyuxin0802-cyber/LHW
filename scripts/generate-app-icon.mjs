#!/usr/bin/env node
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src-tauri/icons/app-icon.svg");
const output = join(root, "src-tauri/icons");

execSync(`npx tauri icon ${JSON.stringify(source)} -o ${JSON.stringify(output)}`, {
  cwd: root,
  stdio: "inherit",
});

console.log("[generate-app-icon] Icons written to src-tauri/icons");
