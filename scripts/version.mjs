import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "check";
const packagePaths = ["package.json", "apps/web/package.json", "apps/worker/package.json", "packages/shared/package.json"];
const versionFilePath = "packages/shared/src/version.ts";
const openApiPath = "docs/openapi.yaml";
const changelogPath = "CHANGELOG.md";

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  writeFileSync(resolve(repoRoot, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildVersionFile(version) {
  return `export const WEMAIL_VERSION = "${version}";\nexport const WEMAIL_VERSION_LABEL = \`v\${WEMAIL_VERSION}\`;\n`;
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Root package.json version must be SemVer-compatible: ${version}`);
  }
}

function syncPackageVersions(version) {
  for (const packagePath of packagePaths.slice(1)) {
    const packageJson = readJson(packagePath);
    if (packageJson.version === version) continue;
    packageJson.version = version;
    writeJson(packagePath, packageJson);
    console.log(`synced ${packagePath} -> ${version}`);
  }
}

function syncVersionFile(version) {
  const nextContent = buildVersionFile(version);
  const absolutePath = resolve(repoRoot, versionFilePath);
  const currentContent = readFileSync(absolutePath, "utf8");

  if (currentContent === nextContent) return;
  writeFileSync(absolutePath, nextContent, "utf8");
  console.log(`synced ${versionFilePath} -> ${version}`);
}

function generateOpenApi() {
  const result = spawnSync("node", ["apps/worker/scripts/generate-openapi.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function checkPackageVersions(version, errors) {
  for (const packagePath of packagePaths.slice(1)) {
    const packageJson = readJson(packagePath);
    if (packageJson.version !== version) {
      errors.push(`${packagePath} version is ${packageJson.version}, expected ${version}`);
    }
  }
}

function checkVersionFile(version, errors) {
  const expected = buildVersionFile(version);
  const actual = readFileSync(resolve(repoRoot, versionFilePath), "utf8");
  if (actual !== expected) {
    errors.push(`${versionFilePath} is out of sync with root version ${version}`);
  }
}

function checkOpenApi(version, errors) {
  const openApi = readJson(openApiPath);
  if (openApi.info?.version !== version) {
    errors.push(`${openApiPath} info.version is ${openApi.info?.version}, expected ${version}`);
  }
}

function checkChangelog(version, errors) {
  const changelog = readFileSync(resolve(repoRoot, changelogPath), "utf8");
  if (!changelog.includes("## [Unreleased]")) {
    errors.push(`${changelogPath} is missing the [Unreleased] section`);
  }

  if (!changelog.includes(`## [${version}] - `)) {
    errors.push(`${changelogPath} is missing a release section for ${version}`);
  }
}

const rootPackage = readJson("package.json");
const version = rootPackage.version;
assertSemver(version);

if (mode === "sync") {
  syncPackageVersions(version);
  syncVersionFile(version);
  generateOpenApi();
  console.log(`version metadata synced to ${version}`);
} else if (mode === "check") {
  const errors = [];
  checkPackageVersions(version, errors);
  checkVersionFile(version, errors);
  checkOpenApi(version, errors);
  checkChangelog(version, errors);

  if (errors.length > 0) {
    console.error("Version metadata is out of sync:");
    errors.forEach((error) => console.error(`- ${error}`));
    console.error("Run pnpm version:sync to repair.");
    process.exit(1);
  }

  console.log(`version metadata is in sync at ${version}`);
} else {
  console.error(`Unsupported mode: ${mode}. Use "sync" or "check".`);
  process.exit(1);
}
