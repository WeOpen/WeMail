import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function getRuleBody(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = sharedStyles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"));

  return Array.from(matches, (match) => match[1]).join("\n");
}

describe("webhook styles", () => {
  it("keeps side rail endpoint actions compact and visually balanced", () => {
    const actionsRule = getRuleBody(".webhook-side-actions");
    const actionButtonRule = getRuleBody(".webhook-side-actions .ui-button");
    const dangerRule = getRuleBody(".webhook-side-actions .ui-button-danger");
    const darkDangerRule = getRuleBody(":root[data-theme=\"dark\"] .webhook-side-actions .ui-button-danger");

    expect(actionsRule).toContain("grid-template-columns: repeat(3, minmax(72px, 1fr))");
    expect(actionsRule).toContain("gap: 8px");
    expect(actionButtonRule).toContain("min-height: 40px");
    expect(actionButtonRule).toContain("padding-inline: 10px");
    expect(actionButtonRule).toContain("box-shadow: none");
    expect(dangerRule).toContain("background: color-mix(in srgb, #d64545 9%, var(--surface-strong))");
    expect(dangerRule).toContain("color: color-mix(in srgb, #c93434 90%, var(--text))");
    expect(dangerRule).toContain("box-shadow: none");
    expect(darkDangerRule).toContain("color: color-mix(in srgb, #ff9d9d 86%, var(--text))");
  });
});
