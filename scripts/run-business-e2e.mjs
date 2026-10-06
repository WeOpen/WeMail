import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(tmpdir(), "wemail-business-"));
const configPath = join(temporary, "wrangler.jsonc");
const statePath = join(temporary, "state");
const webOutput = join(temporary, "web");
const backendUrl = "http://127.0.0.1:8789";
const webUrl = "http://127.0.0.1:4187";
const token = randomBytes(32).toString("hex");
const children = new Map();
const baseEnvironment = { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" };
const logs = { worker: "", web: "" };

function start(args, cwd = root, env = baseEnvironment, logName) {
  const child = spawn("pnpm", args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
  const complete = new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolvePromise({ code, signal }));
  });
  children.set(child, complete);
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    if (logName) logs[logName] += chunk.toString();
    else process.stdout.write(chunk);
  });
  return { child, complete };
}

async function run(args, cwd, env) {
  const { complete } = start(args, cwd, env);
  const { code } = await complete;
  if (code !== 0) throw new Error(`Command failed (${code}): pnpm ${args.join(" ")}`);
}

async function waitForUrl(url, child) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Local server exited (${child.exitCode}): ${url}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* The server is still binding its port. */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Local server did not become ready: ${url}`);
}

async function stopChildren() {
  for (const child of children.keys()) {
    if (child.exitCode !== null || !child.pid) continue;
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch { /* The child already exited. */ }
  }
  await Promise.allSettled([...children.values()]);
}
process.once("SIGINT", () => { void stopChildren(); });
process.once("SIGTERM", () => { void stopChildren(); });

try {
  await writeFile(configPath, JSON.stringify({
    name: "wemail-business-test", main: join(root, "apps/worker/tests/business/test-entry.ts"),
    compatibility_date: "2025-04-01", compatibility_flags: ["nodejs_compat"],
    vars: { ENVIRONMENT: "local", APP_NAME: "WeMail", COOKIE_NAME: "wemail_session", COOKIE_SECURE: "false", CORS_ALLOWED_ORIGINS: webUrl, RESEND_API_KEY: "business-test-provider-key", ENABLE_AI: "false" },
    d1_databases: [{ binding: "DB", database_name: "wemail-business", database_id: "business-local", migrations_dir: join(root, "apps/worker/src/infrastructure/db/migrations") }],
    kv_namespaces: [{ binding: "CACHE", id: "business-local-cache" }],
    r2_buckets: [{ binding: "ATTACHMENTS", bucket_name: "business-local-attachments" }]
  }, null, 2));
  await writeFile(join(temporary, ".dev.vars"), `BUSINESS_TEST_TOKEN=${token}\n`);
  await run(["exec", "wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", configPath, "--persist-to", statePath]);
  const worker = start(["exec", "wrangler", "dev", "--local", "--config", configPath, "--persist-to", statePath, "--ip", "127.0.0.1", "--port", "8789", "--inspector-port", "9231"], root, baseEnvironment, "worker");
  await waitForUrl(`${backendUrl}/api/system/health`, worker.child);
  const seed = await fetch(`${backendUrl}/__test/seed`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  if (!seed.ok) throw new Error(`Test seeding failed: ${await seed.text()}`);
  await run(["exec", "vite", "build", "--outDir", webOutput], join(root, "apps/web"), { ...baseEnvironment, VITE_API_BASE_URL: backendUrl });
  const web = start(["exec", "vite", "preview", "--outDir", webOutput, "--host", "127.0.0.1", "--port", "4187", "--strictPort"], join(root, "apps/web"), baseEnvironment, "web");
  await waitForUrl(webUrl, web.child);
  await run(["exec", "playwright", "test", "-c", "apps/web/playwright.business.config.ts", ...process.argv.slice(2)], root, { ...baseEnvironment, BUSINESS_API_URL: backendUrl, BUSINESS_WEB_URL: webUrl, BUSINESS_TEST_TOKEN: token });
} catch (error) {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : error);
} finally {
  await stopChildren();
  const artifactDirectory = join(root, "apps/web/test-results/business");
  await mkdir(artifactDirectory, { recursive: true });
  for (const [name, content] of Object.entries(logs)) await writeFile(join(artifactDirectory, `${name}.log`), content.replaceAll(token, "[test-token]"));
  await rm(temporary, { recursive: true, force: true });
}
