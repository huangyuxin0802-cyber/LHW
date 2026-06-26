#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appName = "小幽灵";
const bundleDir = join(
  root,
  "src-tauri/target/universal-apple-darwin/release/bundle/macos"
);
const bundleApp = join(bundleDir, `${appName}.app`);
const desktopApp = join(homedir(), "Desktop", `${appName}.app`);
const desktopZip = join(homedir(), "Desktop", `${appName}-mac.zip`);
const webDownloadsDir = join(root, "public/downloads");
const webZipName = "ghost-mac.zip";
const webZipPath = join(webDownloadsDir, webZipName);
const updatesDir = join(root, "public/desktop-updates");
const updateBundleName = "desktop-pet.app.tar.gz";
const updateBundlePath = join(updatesDir, updateBundleName);
const updateManifestPath = join(updatesDir, "latest.json");
const privateKeyPath = join(root, "src-tauri/.updater/private.key");
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://lhw-six.vercel.app";

function run(command, env = {}) {
  console.log(`\n> ${command}`);
  execSync(command, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function bumpPatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

function syncVersionFiles(nextVersion) {
  const packageJsonPath = join(root, "package.json");
  const tauriConfPath = join(root, "src-tauri/tauri.conf.json");
  const cargoPath = join(root, "src-tauri/Cargo.toml");

  const packageJson = readJson(packageJsonPath);
  packageJson.version = nextVersion;
  writeJson(packageJsonPath, packageJson);

  const tauriConf = readJson(tauriConfPath);
  tauriConf.version = nextVersion;
  writeJson(tauriConfPath, tauriConf);

  let cargoToml = readFileSync(cargoPath, "utf8");
  cargoToml = cargoToml.replace(
    /^version = "[^"]+"/m,
    `version = "${nextVersion}"`
  );
  writeFileSync(cargoPath, cargoToml, "utf8");
}

function clearQuarantine(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  try {
    execSync(`xattr -cr ${JSON.stringify(targetPath)}`, { stdio: "inherit" });
  } catch {
    console.warn(`[export] Could not clear quarantine on ${targetPath}`);
  }
}

function createDistributionZip(sourceApp, zipPath) {
  const stageDir = join(root, ".export-stage-mac");
  const stagedApp = join(stageDir, `${appName}.app`);
  const guidePath = join(stageDir, "安装说明.txt");

  if (existsSync(stageDir)) {
    rmSync(stageDir, { recursive: true, force: true });
  }
  mkdirSync(stageDir, { recursive: true });

  run(`ditto ${JSON.stringify(sourceApp)} ${JSON.stringify(stagedApp)}`);
  copyFileSync(join(root, "scripts/mac-install-guide.txt"), guidePath);
  clearQuarantine(stagedApp);

  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }

  run(
    `ditto -c -k --sequesterRsrc ${JSON.stringify(stageDir)} ${JSON.stringify(zipPath)}`
  );
  rmSync(stageDir, { recursive: true, force: true });
}

function findUpdaterArtifacts() {
  const entries = existsSync(bundleDir) ? readdirSync(bundleDir) : [];
  const archive = entries.find((name) => name.endsWith(".app.tar.gz"));
  if (!archive) {
    throw new Error(
      `Updater bundle not found in ${bundleDir}. Ensure createUpdaterArtifacts is enabled and signing key is configured.`
    );
  }

  const signatureFile = `${archive}.sig`;
  if (!entries.includes(signatureFile)) {
    throw new Error(`Signature file not found: ${signatureFile}`);
  }

  return {
    archivePath: join(bundleDir, archive),
    signaturePath: join(bundleDir, signatureFile),
  };
}

function ensureUniversalMacTarget() {
  const installed = execSync("rustup target list --installed", {
    encoding: "utf8",
  });
  if (!installed.includes("x86_64-apple-darwin")) {
    console.log("[export] Installing x86_64-apple-darwin for universal Mac build…");
    run("rustup target add x86_64-apple-darwin");
  }
}

function publishUpdaterManifest(version) {
  const { archivePath, signaturePath } = findUpdaterArtifacts();
  const signature = readFileSync(signaturePath, "utf8").trim();

  copyFileSync(archivePath, updateBundlePath);

  const platformEntry = {
    signature,
    url: `${siteUrl}/desktop-updates/${updateBundleName}`,
  };

  const manifest = {
    version,
    notes: `小幽灵 v${version} — 支持 Apple Silicon 与 Intel Mac`,
    pub_date: new Date().toISOString(),
    platforms: {
      "darwin-aarch64": platformEntry,
      "darwin-x86_64": platformEntry,
    },
  };

  writeJson(updateManifestPath, manifest);
}

if (!existsSync(privateKeyPath)) {
  throw new Error(
    `Missing updater private key at ${privateKeyPath}. Run: CI=true npx tauri signer generate -w src-tauri/.updater/private.key -f -p ""`
  );
}

const currentVersion = readJson(join(root, "package.json")).version;
const nextVersion = bumpPatchVersion(currentVersion);

console.log(`[export] Bumping version ${currentVersion} -> ${nextVersion}`);
syncVersionFiles(nextVersion);
run("node scripts/sync-app-version.mjs");

ensureUniversalMacTarget();

run("npx tauri build --bundles app --target universal-apple-darwin", {
  CARGO_TARGET_DIR: join(root, "src-tauri/target"),
  TAURI_SIGNING_PRIVATE_KEY: readFileSync(privateKeyPath, "utf8"),
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD:
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? "",
});

if (!existsSync(bundleApp)) {
  throw new Error(`Build output not found: ${bundleApp}`);
}

publishUpdaterManifest(nextVersion);

try {
  if (existsSync(desktopApp)) {
    rmSync(desktopApp, { recursive: true, force: true });
  }
  run(`ditto ${JSON.stringify(bundleApp)} ${JSON.stringify(desktopApp)}`);
  clearQuarantine(desktopApp);
} catch (error) {
  console.warn(
    `[export] Skipped Desktop copy: ${error instanceof Error ? error.message : error}`
  );
}

if (existsSync(desktopZip)) {
  rmSync(desktopZip, { force: true });
}

createDistributionZip(bundleApp, webZipPath);

try {
  createDistributionZip(bundleApp, desktopZip);
} catch (error) {
  console.warn(
    `[export] Skipped Desktop zip: ${error instanceof Error ? error.message : error}`
  );
}

writeFileSync(
  join(homedir(), "Desktop", `${appName}-version.json`),
  `${JSON.stringify(
    {
      version: nextVersion,
      builtAt: new Date().toISOString(),
      productName: appName,
      file: `${appName}-mac.zip`,
      updateManifest: `${siteUrl}/desktop-updates/latest.json`,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log("\n[export] Done.");
console.log(`  Version:  ${nextVersion}`);
console.log(`  App:      ${desktopApp}`);
console.log(`  Zip:      ${desktopZip}`);
console.log(`  Web zip:  ${webZipPath}`);
console.log(`  Download: ${siteUrl}/downloads/${webZipName}`);
console.log(`  Manifest: ${updateManifestPath}`);
console.log(`  Bundle:   ${updateBundlePath}`);
console.log("\n[export] Deploy updates:");
console.log("  git add public/downloads public/desktop-updates && git commit && git push");
console.log(`  Share link: ${siteUrl}/download`);
