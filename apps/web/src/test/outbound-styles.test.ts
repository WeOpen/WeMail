import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function getRuleBody(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = sharedStyles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"));

  return Array.from(matches, (match) => match[1]).join("\n");
}

describe("outbound styles", () => {
  it("keeps the mailbox selector and summary cards balanced in the desktop command strip", () => {
    const commandStripRule = getRuleBody(".outbound-command-strip");
    const statGridRule = getRuleBody(".outbound-stat-grid");

    expect(commandStripRule).toContain("grid-template-columns: minmax(280px, 1.15fr) minmax(0, 2.85fr)");
    expect(commandStripRule).not.toContain("repeat(4");
    expect(statGridRule).toContain("display: grid");
    expect(statGridRule).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  it("gives outbound summary cards a stable border and hover treatment", () => {
    const statCardRule = getRuleBody(".outbound-stat-card");
    const statCardHoverRule = getRuleBody(".outbound-stat-card:hover");
    const reducedMotionRule = getRuleBody(".outbound-mailbox-trigger.ui-button:hover,\n  .outbound-mailbox-trigger.ui-button:focus-visible,\n  .outbound-stat-card:hover");

    expect(statCardRule).toContain("--outbound-stat-accent: var(--accent)");
    expect(statCardRule).toContain("border: 1px solid color-mix(in srgb, var(--outbound-stat-accent) 32%, var(--border-subtle))");
    expect(statCardRule).toContain("transition:");
    expect(statCardHoverRule).toContain("border-color: color-mix(in srgb, var(--outbound-stat-accent) 42%, var(--border-strong))");
    expect(statCardHoverRule).toContain("box-shadow:");
    expect(statCardHoverRule).toContain("transform: translateY(-2px)");
    expect(reducedMotionRule).toContain("transform: none");
  });
});
