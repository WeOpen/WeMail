import { afterEach, describe, expect, it, vi } from "vitest";

import { formatReceivedAt, formatSenderName } from "../features/inbox/formatters";

describe("inbox formatters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows hour, minute, and second for messages received today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13, 22, 7, 0));

    expect(formatReceivedAt(new Date(2026, 5, 13, 9, 42, 5).toISOString())).toBe("09:42:05");
  });

  it("shows date and time down to seconds for messages received before today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13, 22, 7, 0));

    expect(formatReceivedAt(new Date(2026, 3, 8, 8, 0, 6).toISOString())).toBe("2026-04-08 08:00:06");
  });

  it("formats sender names from sender domains", () => {
    expect(formatSenderName("no-reply@acme.dev")).toBe("Acme");
    expect(formatSenderName("security@github.com")).toBe("GitHub");
  });
});
