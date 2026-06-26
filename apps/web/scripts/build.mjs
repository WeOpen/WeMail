import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(scriptDir, "..");
const generatorPath = resolve(scriptDir, "../../worker/scripts/generate-api-interface-catalog.mjs");
const budgetPath = resolve(scriptDir, "check-bundle-budget.mjs");

function run(command, args, cwd = webDir) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("node", [generatorPath]);
run("pnpm", ["exec", "vite", "build"]);
run("node", [budgetPath]);
