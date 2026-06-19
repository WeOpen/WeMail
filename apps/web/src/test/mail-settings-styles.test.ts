import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

describe("mail settings styles", () => {
  it("keeps notification target controls visually equal height", () => {
    expect(sharedStyles).toMatch(/\.mail-settings-target-grid\s*\{[^}]*align-items:\s*stretch;/);
    expect(sharedStyles).toMatch(/\.mail-settings-target-field\s*\{[^}]*grid-template-rows:\s*auto 1fr;/);
    expect(sharedStyles).toMatch(/\.mail-settings-target-control\.form-control\s*\{[^}]*height:\s*56px;/);
  });
});
