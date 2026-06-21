import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function getRuleBody(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = sharedStyles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"));

  return Array.from(matches, (match) => match[1]).join("\n");
}

describe("floating back-to-top styles", () => {
  it("keeps the shared floating action visible in dark mode", () => {
    const baseRule = getRuleBody(".floating-back-to-top.ui-button");
    const darkRule = getRuleBody(":root[data-theme=\"dark\"] .floating-back-to-top.ui-button");

    expect(baseRule).toContain("position: fixed");
    expect(baseRule).toContain("color: var(--text)");
    expect(darkRule).toContain("background: color-mix(in srgb, var(--surface-strong) 84%, #000 16%)");
    expect(darkRule).toContain("color: var(--text)");
  });
});
