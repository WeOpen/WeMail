import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app", "global.css"), "utf8");
const homePage = readFileSync(resolve(process.cwd(), "app", "(home)", "page.tsx"), "utf8");
const layoutPage = readFileSync(resolve(process.cwd(), "app", "layout.tsx"), "utf8");
const deploymentPage = readFileSync(resolve(process.cwd(), "content", "docs", "deployment.mdx"), "utf8");
const operationsPage = readFileSync(resolve(process.cwd(), "content", "docs", "operations.mdx"), "utf8");
const deployRunbook = readFileSync(resolve(process.cwd(), "..", "..", "docs", "deploy-runbook.md"), "utf8");

function readCssBlock(selector) {
  const match = css.match(new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `Expected to find CSS block for ${selector}`);
  return match[1];
}

const heroBlock = readCssBlock(".docs-home-hero");

assert.match(heroBlock, /min-height:\s*min\(760px,\s*calc\(100dvh - 24px\)\);/);
assert.match(heroBlock, /align-items:\s*start;/);
assert.match(heroBlock, /padding:\s*104px 0 58px;/);
assert.ok(!heroBlock.includes("min-height: 100dvh;"));
assert.ok(!heroBlock.includes("align-items: center;"));

assert.ok(homePage.includes('src="/brand/WeMail-favicon.png"'));
assert.ok(layoutPage.includes("export const viewport"));
assert.ok(layoutPage.includes('themeColor: "#ff7a00"'));
const metadataBlock = layoutPage.slice(
  layoutPage.indexOf("export const metadata"),
  layoutPage.indexOf("export const viewport")
);
assert.ok(!metadataBlock.includes("themeColor"));

const vercelDeployQuery = "vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWeOpen%2FWeMail";

assert.ok(homePage.includes(vercelDeployQuery));
assert.ok(homePage.includes("root-directory=apps%2Fdocs"));
assert.ok(homePage.includes("env=NEXT_PUBLIC_SITE_URL"));
assert.ok(homePage.includes("docs-home-vercel-action"));
assert.ok(homePage.includes("一键部署"));

assert.ok(deploymentPage.includes("https://vercel.com/button"));
assert.ok(deploymentPage.includes(vercelDeployQuery));
assert.ok(deploymentPage.includes("root-directory=apps%2Fdocs"));
assert.ok(deploymentPage.includes("NEXT_PUBLIC_SITE_URL"));
assert.ok(deploymentPage.includes("Deploy with Vercel"));

assert.ok(operationsPage.includes("CLOUDFLARE_D1_DATABASE_ID"));
assert.ok(operationsPage.includes("CLOUDFLARE_KV_NAMESPACE_ID"));
assert.ok(operationsPage.includes("CLOUDFLARE_KV_PREVIEW_NAMESPACE_ID"));

assert.ok(deployRunbook.includes("系统设置里的默认邮箱域名"));
assert.ok(!deployRunbook.includes("对应邮件域名"));
