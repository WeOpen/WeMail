import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseTomlSubset } from "../../../scripts/preflight-check.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const fixtureToml = [
  'name = "wemail"',
  "",
  "[env.production]",
  "workers_dev = true",
  "",
  "[env.production.vars]",
  'CORS_ALLOWED_ORIGINS = "https://mail.example.com"',
  "",
  "[[env.production.d1_databases]]",
  'binding = "DB"',
  'database_name = "wemail-production"',
  'database_id = "replace-with-production-d1-id"',
  "",
  "[[env.production.kv_namespaces]]",
  'binding = "CACHE"',
  'id = "real-kv-id"',
  "",
  "[env.production.triggers]",
  'crons = ["0 * * * *"]',
  "",
  "routes = [",
  '  { pattern = "example.com/api/*", zone_name = "example.com" },',
  "]"
].join("\n");

describe("preflight check script", () => {
  it("parses the wrangler.toml subset the check depends on", () => {
    const config = parseTomlSubset(fixtureToml);

    expect(config.name).toBe("wemail");
    expect(config.env.production.vars.CORS_ALLOWED_ORIGINS).toBe("https://mail.example.com");
    expect(config.env.production.d1_databases[0].database_id).toBe("replace-with-production-d1-id");
    expect(config.env.production.kv_namespaces[0].id).toBe("real-kv-id");
    expect(config.env.production.triggers.crons).toEqual(["0 * * * *"]);
  });

  it("skips multi-line route arrays without corrupting the surrounding sections", () => {
    const config = parseTomlSubset(fixtureToml);
    // routes is skipped (unparsed), but sections after it still resolve.
    // Bare (unquoted) values stay raw strings — the subset this script reads
    // only consumes quoted strings and arrays.
    expect(config.env.production.workers_dev).toBe("true");
  });

  it("passes against the repository's shipped wrangler.toml in workflow mode", () => {
    // Placeholders are by design here (the deploy workflow injects real ids),
    // so default mode must pass; manual mode must fail on them.
    const output = execFileSync("node", [resolve(repoRoot, "scripts/preflight-check.mjs")], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    expect(output).toContain("清理 cron 已调度");

    let manualFailed = false;
    try {
      execFileSync("node", [resolve(repoRoot, "scripts/preflight-check.mjs"), "--manual"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe"
      });
    } catch {
      manualFailed = true;
    }
    expect(manualFailed).toBe(true);
  });
});
