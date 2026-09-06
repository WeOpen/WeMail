#!/usr/bin/env node
// Deployment preflight: catch the fork-and-deploy failure modes before they
// become silent production gaps (missing cron triggers, leftover
// `replace-with-*` placeholders, missing bindings). Exit 1 on any error.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const wranglerPath = resolve(process.cwd(), "apps/worker/wrangler.toml");

// Minimal reader for the TOML subset wrangler.toml uses: section headers
// ([env.x] / [[env.x.y]]), simple `key = "value"` strings, and one-line
// arrays. Multi-line arrays (routes) are skipped until their bracket closes.
export function parseTomlSubset(source) {
  const config = {};
  let target = config;
  let skippingMultilineArray = false;

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (skippingMultilineArray) {
      if (line.endsWith("]")) skippingMultilineArray = false;
      continue;
    }
    if (!line || line.startsWith("#")) continue;

    const arrayHeader = line.match(/^\[\[\s*([\w.-]+)\s*\]\]$/);
    if (arrayHeader) {
      target = pushInto(config, arrayHeader[1].split("."));
      continue;
    }
    const tableHeader = line.match(/^\[\s*([\w.-]+)\s*\]$/);
    if (tableHeader) {
      target = descendInto(config, tableHeader[1].split("."));
      continue;
    }

    const pair = line.match(/^([\w-]+)\s*=\s*(.+)$/);
    if (!pair) continue;
    const [, key, rawValue] = pair;
    if (rawValue.startsWith("[")) {
      if (!rawValue.endsWith("]")) {
        skippingMultilineArray = true;
        continue;
      }
      try {
        target[key] = JSON.parse(rawValue.replace(/'/g, '"'));
      } catch {
        target[key] = rawValue;
      }
      continue;
    }
    const stringValue = rawValue.match(/^"([^"]*)"$/);
    target[key] = stringValue ? stringValue[1] : rawValue;
  }
  return config;
}

function descendInto(node, path) {
  let current = node;
  for (const segment of path) {
    if (typeof current[segment] !== "object" || current[segment] === null) current[segment] = {};
    current = current[segment];
  }
  return current;
}

function pushInto(node, path) {
  const parent = descendInto(node, path.slice(0, -1));
  const key = path[path.length - 1];
  if (!Array.isArray(parent[key])) parent[key] = [];
  const entry = {};
  parent[key].push(entry);
  return entry;
}

function isPlaceholder(value) {
  return typeof value === "string" && value.startsWith("replace-with");
}

function checkEnvironment(name, env, manualMode) {
  const errors = [];
  const warnings = [];
  const ok = (label) => console.log(`  ✓ ${label}`);

  // 上游开源仓库故意用 replace-with-* 占位符，由 GitHub Actions 部署时从
  // Environment secrets 注入并校验。走工作流部署时占位符是预期状态（提示）；
  // 手动 wrangler deploy 必须替换（错误）。
  const reportPlaceholder = (label, value) => {
    if (manualMode) errors.push(`${label} 仍是占位符：${value}（手动部署必须替换）`);
    else console.log(`  ℹ ${label} 为占位符 ${value} —— GitHub Actions 部署会自动注入；手动部署请用 --manual 复查`);
  };

  const d1 = env.d1_databases?.[0];
  if (!d1) errors.push("缺少 D1 绑定 [[<env>.d1_databases]]");
  else if (isPlaceholder(d1.database_id)) reportPlaceholder("D1 database_id", d1.database_id);
  else ok(`D1 绑定 → ${d1.database_name}`);

  const kv = env.kv_namespaces?.[0];
  if (!kv) errors.push("缺少 KV 绑定 [[<env>.kv_namespaces]]");
  else if (isPlaceholder(kv.id)) reportPlaceholder("KV id", kv.id);
  else ok("KV 绑定已配置");

  const crons = env.triggers?.crons;
  if (!Array.isArray(crons) || crons.length === 0) {
    errors.push("缺少 [triggers] crons —— 清理任务不会被调度（0.2.10 的教训）");
  } else {
    ok(`清理 cron 已调度（${crons.join(", ")}）`);
  }

  const cors = env.vars?.CORS_ALLOWED_ORIGINS;
  if (!cors) errors.push("缺少 vars.CORS_ALLOWED_ORIGINS");
  else if (/localhost|127\.0\.0\.1/.test(cors)) errors.push(`CORS_ALLOWED_ORIGINS 仍指向本地开发地址：${cors}`);
  else ok(`CORS 允许来源：${cors}`);

  if (!env.r2_buckets?.[0]) warnings.push("未声明 R2 桶：附件存储将禁用（消息可收，附件不可用）");
  else ok(`R2 桶 → ${env.r2_buckets[0].bucket_name}`);

  if (!env.ratelimits?.[0]) warnings.push("未声明 Rate Limiter：登录/注册/发送不限速");

  for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  if (errors.length > 0) for (const error of errors) console.log(`  ✗ ${error}`);
  return errors.length;
}

function main() {
  const manualMode = process.argv.includes("--manual");
  const config = parseTomlSubset(readFileSync(wranglerPath, "utf8"));
  let failures = 0;

  console.log(`WeMail 部署前自检（apps/worker/wrangler.toml）${manualMode ? " [手动部署模式]" : ""}\n`);

  const environments = ["staging", "production"];
  for (const name of environments) {
    console.log(`[${name}]`);
    const env = config.env?.[name];
    if (!env) {
      console.log(`  ✗ 缺少 [env.${name}] 配置段`);
      failures += 1;
      console.log("");
      continue;
    }
    failures += checkEnvironment(name, env, manualMode);
    console.log("");
  }

  console.log(
    failures === 0
      ? "自检通过：远端环境配置完整。别忘了 GitHub Environment secrets（CLOUDFLARE_* / VITE_API_BASE_URL）与 Email Routing。"
      : `自检发现 ${failures} 处配置错误（占位符在内），手动部署前必须修复；通过 GitHub Actions 部署则由工作流注入校验。`
  );
  process.exit(failures === 0 ? 0 : 1);
}

// Run only when executed directly, not when imported by tests.
if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
