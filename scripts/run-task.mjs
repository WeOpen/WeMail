import { spawnSync } from "node:child_process";

const task = process.argv[2];
const extraArgs = process.argv.slice(3);

const filterIndex = extraArgs.findIndex((arg) => arg === "--filter");
const filter =
  filterIndex >= 0 && filterIndex < extraArgs.length - 1 ? extraArgs[filterIndex + 1] : null;

const packageTasks = {
  shared: {
    lint: ["pnpm", ["exec", "eslint", "src", "tests"]],
    typecheck: ["pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"]],
    test: ["pnpm", ["exec", "vitest", "run"]],
    build: ["pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--emitDeclarationOnly", "false"]]
  },
  worker: {
    lint: ["pnpm", ["exec", "eslint", "src", "tests"]],
    typecheck: ["pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"]],
    test: ["pnpm", ["exec", "vitest", "run"]],
    build: ["node", ["../../scripts/wrangler-dry-run.mjs", "deploy", "--env=", "--dry-run", "--outdir", "dist"]]
  },
  web: {
    lint: ["pnpm", ["exec", "eslint", "src"]],
    typecheck: ["pnpm", ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"]],
    test: ["pnpm", ["exec", "vitest", "run"]],
    build: ["node", ["scripts/build.mjs"]]
  },
  docs: {
    lint: ["pnpm", ["run", "lint"]],
    typecheck: ["pnpm", ["run", "typecheck"]],
    test: ["pnpm", ["run", "test"]],
    build: ["pnpm", ["run", "build"]]
  }
};

const packageDirs = {
  shared: "packages/shared",
  worker: "apps/worker",
  web: "apps/web",
  docs: "apps/docs"
};

const allTargets = ["shared", "worker", "web", "docs"];
const targets = filter ? allTargets.filter((target) => target.includes(filter)) : allTargets;

if (!task || !packageTasks.shared[task]) {
  console.error(`Unsupported task: ${task ?? "(missing)"}`);
  process.exit(1);
}

if (targets.length === 0) {
  console.error(`No package matched filter: ${filter}`);
  process.exit(1);
}

for (const target of targets) {
  const [command, args, options = {}] = packageTasks[target][task];
  console.log(`\n==> ${task}:${target}`);
  const result = spawnSync(command, args, {
    cwd: packageDirs[target],
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
