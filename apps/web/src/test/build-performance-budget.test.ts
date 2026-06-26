import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("web build performance budget", () => {
  it("groups heavyweight libraries into stable async chunks and keeps warnings strict", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain("chunkSizeWarningLimit: 260");
    expect(viteConfig).toContain("manualChunks");
    expect(viteConfig).toContain("nivo");
    expect(viteConfig).toContain("react-vendor");
    expect(viteConfig).toContain("react-dom-vendor");
    expect(viteConfig).toContain("router-vendor");
    expect(viteConfig).toContain("state-vendor");
  });

  it("runs the production bundle budget check after Vite builds", () => {
    const buildScript = readFileSync("scripts/build.mjs", "utf8");
    const budgetScript = readFileSync("scripts/check-bundle-budget.mjs", "utf8");

    expect(buildScript).toContain("check-bundle-budget.mjs");
    expect(budgetScript).toContain("index");
    expect(budgetScript).toContain("WorkspaceApp");
    expect(budgetScript).toContain("react-vendor");
    expect(budgetScript).toContain("react-dom-vendor");
    expect(budgetScript).toContain("nivo-legends");
  });
});
