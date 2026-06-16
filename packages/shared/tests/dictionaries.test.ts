import { describe, expect, it } from "vitest";

import { buildDictionaryCatalog } from "../src/index";

describe("buildDictionaryCatalog", () => {
  it("merges item overrides and hides disabled items by default", () => {
    const [visibleCatalog] = buildDictionaryCatalog({
      groupKeys: ["announcement.type"],
      items: [
        {
          groupKey: "announcement.type",
          value: "运营通知",
          label: "运营通知",
          description: null,
          sortOrder: 30,
          enabled: false,
          metadata: {},
          updatedAt: "2026-06-15T00:00:00.000Z"
        }
      ]
    });

    expect(visibleCatalog?.items.map((item) => item.value)).not.toContain("运营通知");

    const [adminCatalog] = buildDictionaryCatalog({
      groupKeys: ["announcement.type"],
      includeDisabled: true,
      items: [
        {
          groupKey: "announcement.type",
          value: "运营通知",
          label: "运营通知",
          description: null,
          sortOrder: 30,
          enabled: false,
          metadata: {},
          updatedAt: "2026-06-15T00:00:00.000Z"
        }
      ]
    });

    expect(adminCatalog?.items).toContainEqual(expect.objectContaining({ enabled: false, value: "运营通知" }));
  });
});
