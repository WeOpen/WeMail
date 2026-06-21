import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wranglerBin = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const args = process.argv.slice(2);
const completionMarker = "--dry-run: exiting now.";
const timeoutMs = 120_000;
const outdirIndex = args.findIndex((arg) => arg === "--outdir");
const bundlePath = outdirIndex >= 0 && args[outdirIndex + 1] ? resolve(process.cwd(), args[outdirIndex + 1], "index.js") : null;
const previousBundleMtime = bundlePath ? readBundleMtime(bundlePath) : 0;

let markerSeen = false;
let finished = false;
let outputBuffer = "";

function readBundleMtime(path) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

const child = spawn(process.execPath, [wranglerBin, ...args], {
  cwd: process.cwd(),
  detached: process.platform !== "win32",
  env: {
    ...process.env,
    CI: "1"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

function stopChild(signal = "SIGTERM") {
  if (child.exitCode !== null || child.killed) return;

  try {
    if (process.platform === "win32") {
      child.kill(signal);
    } else if (child.pid) {
      process.kill(-child.pid, signal);
    }
  } catch {
    child.kill(signal);
  }
}

function finish(code) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  clearInterval(bundlePoll);
  process.exitCode = code;
}

function markCompleted() {
  markerSeen = true;
  stopChild();
}

function handleOutput(stream, chunk) {
  stream.write(chunk);
  outputBuffer += chunk.toString();

  if (outputBuffer.includes(completionMarker)) {
    markCompleted();
  }
}

const timeout = setTimeout(() => {
  console.error(`Wrangler dry-run did not finish within ${timeoutMs / 1000}s.`);
  stopChild();
  setTimeout(() => stopChild("SIGKILL"), 1_000).unref();
  finish(1);
}, timeoutMs);

const bundlePoll = setInterval(() => {
  if (!bundlePath || markerSeen) return;

  try {
    const stats = statSync(bundlePath);
    if (stats.size > 0 && stats.mtimeMs > previousBundleMtime) {
      markCompleted();
    }
  } catch {
    // Keep waiting for Wrangler to either write the bundle, exit, or hit the timeout.
  }
}, 1_000);

child.stdout.on("data", (chunk) => handleOutput(process.stdout, chunk));
child.stderr.on("data", (chunk) => handleOutput(process.stderr, chunk));

child.on("error", (error) => {
  console.error(error);
  finish(1);
});

child.on("exit", (code, signal) => {
  if (markerSeen) {
    finish(0);
    return;
  }

  if (signal) {
    console.error(`Wrangler dry-run exited via ${signal}.`);
    finish(1);
    return;
  }

  finish(code ?? 1);
});
