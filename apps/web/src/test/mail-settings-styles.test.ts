import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

describe("mail settings styles", () => {
  it("lets the primary settings column occupy the full workspace row", () => {
    expect(sharedStyles).toMatch(/\.mail-settings-page\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  });

  it("right-aligns the mail settings save actions", () => {
    expect(sharedStyles).toMatch(/\.mail-settings-actions\s*\{[^}]*justify-content:\s*flex-end;/);
    expect(sharedStyles).toMatch(/\.mail-settings-save-notice\s*\{[^}]*order:\s*-1;/);
  });

  it("keeps notification target controls visually equal height", () => {
    expect(sharedStyles).toMatch(/\.mail-settings-target-grid\s*\{[^}]*align-items:\s*stretch;/);
    expect(sharedStyles).toMatch(/\.mail-settings-target-field\s*\{[^}]*grid-template-rows:\s*auto 1fr;/);
    expect(sharedStyles).toMatch(/\.mail-settings-target-control\.form-control\s*\{[^}]*height:\s*56px;/);
  });
});
