import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("API interface catalog generation", () => {
  it("keeps the settings page wired to the generated backend catalog", () => {
    const pageSource = readFileSync("src/features/settings/ApiInterfacesPage.tsx", "utf8");

    expect(pageSource).toContain("from \"./api-interface-catalog.generated\"");
    expect(pageSource).not.toContain("const apiInterfaceGroups");
  });

  it("checks the generated catalog against worker routes", () => {
    const result = spawnSync("node", ["../worker/scripts/generate-api-interface-catalog.mjs", "--check"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(`${result.stdout}${result.stderr}`).toBe("");
    expect(result.status).toBe(0);
  });
});
