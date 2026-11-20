import { describe, expect, it } from "vitest";

import { buildMessageExtraction } from "../src/extraction";
import { extractionCorpus } from "./extraction-corpus";

describe("fixed synthetic extraction corpus", () => {
  it("keeps a labelled corpus of at least 50 distinct mail samples", () => {
    expect(extractionCorpus.length).toBeGreaterThanOrEqual(50);
    expect(new Set(extractionCorpus.map((sample) => sample.id)).size).toBe(extractionCorpus.length);
  });

  it("measures exact finding precision and recall on the full corpus", () => {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    const errors: string[] = [];
    for (const sample of extractionCorpus) {
      const actual = new Set(buildMessageExtraction(sample.input).items.map((item) => `${item.type}:${item.value}`));
      const expected = new Set(sample.findings.map(([type, value]) => `${type}:${value}`));
      for (const value of actual) {
        if (expected.has(value)) truePositives += 1;
        else { falsePositives += 1; errors.push(`${sample.id} false positive ${value}`); }
      }
      for (const value of expected) {
        if (!actual.has(value)) { falseNegatives += 1; errors.push(`${sample.id} missing ${value}`); }
      }
    }
    console.info("extraction-corpus", JSON.stringify({ samples: extractionCorpus.length, truePositives, falsePositives, falseNegatives, precision: truePositives / (truePositives + falsePositives), recall: truePositives / (truePositives + falseNegatives), errors }));
    expect(errors).toEqual([]);
  });

  it.each(extractionCorpus.filter((sample) => sample.category === "expiry"))("keeps expiry separate from finding values: $id", (sample) => {
    expect(buildMessageExtraction(sample.input).expiresHint).toBe(sample.expiresHint ?? null);
  });
});
