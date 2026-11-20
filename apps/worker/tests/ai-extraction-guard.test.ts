import { describe, expect, it, vi } from "vitest";

import { buildMessageExtraction } from "@wemail/shared";

import type { AppBindings } from "../src/core/bindings";
import { maybeRunAiFallback } from "../src/shared/mail";

describe("AI extraction evidence and cost boundaries", () => {
  it("skips model invocation when rules found a value or AI is absent", async () => {
    const run = vi.fn();
    const current = buildMessageExtraction({ text: "Code: 234567" });
    expect(await maybeRunAiFallback({ AI: { run } as unknown as AppBindings["AI"] }, current, "Code: 234567")).toBe(current);
    const empty = buildMessageExtraction({ text: "Hello" });
    expect(await maybeRunAiFallback({}, empty, "Hello")).toBe(empty);
    expect(run).not.toHaveBeenCalled();
  });

  it("discards invented codes, unsafe schemes, and invalid model output", async () => {
    const run = vi.fn().mockResolvedValue({ response: JSON.stringify([
      { type: "auth_code", value: "781234" },
      { type: "auth_link", value: "https://invented.example/login" },
      { type: "other_link", value: "javascript:alert(1)" },
      { type: "auth_code", value: "WORDS" },
      { type: "auth_code", value: "483921", label: "Recovery digits" }
    ]) });
    const source = "Recovery digits are 483921. javascript:alert(1) WORDS";
    const actual = await maybeRunAiFallback({ AI: { run } as unknown as AppBindings["AI"] }, buildMessageExtraction({}), source);
    expect(actual.items.map((item) => item.value)).toEqual(["483921"]);
    expect(actual.primary.method).toBe("ai");
    run.mockResolvedValue({ response: "not json" });
    expect((await maybeRunAiFallback({ AI: { run } as unknown as AppBindings["AI"] }, buildMessageExtraction({}), source)).primary.type).toBe("none");
  });

  it("bounds the model prompt and retained suggestions", async () => {
    const findings = Array.from({ length: 12 }, (_, i) => ({ type: "auth_code", value: String(100000 + i), label: "x".repeat(200) }));
    const run = vi.fn().mockResolvedValue({ response: JSON.stringify([...findings, { type: "auth_code", value: "999999" }]) });
    const source = findings.map((item) => item.value).join(" ") + " ".repeat(16_000) + "999999";
    const actual = await maybeRunAiFallback({ AI: { run } as unknown as AppBindings["AI"] }, buildMessageExtraction({}), source);
    expect(run.mock.calls[0][1].messages[1].content).toHaveLength(16_000);
    expect(actual.items).toHaveLength(8);
    expect(actual.items[0].label).toHaveLength(80);
    expect(actual.items.some((item) => item.value === "999999")).toBe(false);
  });
});
