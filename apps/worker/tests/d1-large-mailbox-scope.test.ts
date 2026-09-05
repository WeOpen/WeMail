import { describe, expect, it, vi } from "vitest";

import { createD1Store } from "../src/infrastructure/persistence/d1";

describe("D1 large mailbox scopes", () => {
  it("keeps message list queries below the D1 SQL variable limit", async () => {
    const bindingCounts: number[] = [];
    const preparedSql: string[] = [];
    const statement = {
      bind: vi.fn((...bindings: unknown[]) => {
        bindingCounts.push(bindings.length);
        return statement;
      }),
      first: vi.fn(async () => ({ count: 0, message_count: 0, extraction_count: 0, attachment_count: 0 })),
      all: vi.fn(async () => ({ results: [] }))
    };
    const db = {
      prepare: vi.fn((sql: string) => {
        preparedSql.push(sql);
        return statement;
      })
    } as unknown as D1Database;
    const store = createD1Store(db);

    await store.messages.listForMailboxes({
      mailboxIds: Array.from({ length: 177 }, (_, index) => `mailbox-${index}`),
      includeUnmatched: true,
      page: 1,
      pageSize: 1
    });

    expect(Math.max(...bindingCounts)).toBeLessThanOrEqual(3);
    expect(preparedSql.every((sql) => !sql.includes("?, ?, ?, ?, ?"))).toBe(true);
  });

  it("aggregates outbound usage with a JSON mailbox scope", async () => {
    const bindingCounts: number[] = [];
    const preparedSql: string[] = [];
    const statement = {
      bind: vi.fn((...bindings: unknown[]) => {
        bindingCounts.push(bindings.length);
        return statement;
      }),
      first: vi.fn(async () => ({ total_count: 12, sent_count: 9, failed_count: 3, sent_since_count: 2 })),
      all: vi.fn(async () => ({ results: [] }))
    };
    const db = {
      prepare: vi.fn((sql: string) => {
        preparedSql.push(sql);
        return statement;
      })
    } as unknown as D1Database;
    const store = createD1Store(db);

    await expect(
      store.outboundMessages.summarizeByMailboxes({
        mailboxIds: Array.from({ length: 500 }, (_, index) => `mailbox-${index}`),
        sinceIso: "2026-08-07T00:00:00.000Z"
      })
    ).resolves.toEqual({ totalCount: 12, sentCount: 9, failedCount: 3, sentSinceCount: 2 });

    expect(Math.max(...bindingCounts)).toBe(2);
    expect(preparedSql[0]).toContain("json_each(?)");
  });

  it("chunks IN clauses to respect the D1 bound-parameter limit", async () => {
    // D1 caps bound parameters per query at 100. The cleanup cron and the
    // batch-delete route can pass hundreds of ids at once; every prepared
    // statement must stay at or below the limit or the whole query errors.
    const bindingCounts: number[] = [];
    const inClauseLengths: number[] = [];
    const statement = {
      bind: vi.fn((...bindings: unknown[]) => {
        bindingCounts.push(bindings.length);
        return statement;
      }),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [] })),
      run: vi.fn(async () => ({ success: true }))
    };
    const db = {
      prepare: vi.fn((sql: string) => {
        inClauseLengths.push((sql.match(/\?/g) ?? []).length);
        return statement;
      })
    } as unknown as D1Database;
    const store = createD1Store(db);

    const ids = Array.from({ length: 250 }, (_, index) => `message-${index}`);
    await store.messages.deleteMany(ids);
    await store.attachments.listByMessageIds(ids);
    await store.attachments.deleteByMessageIds(ids);

    expect(bindingCounts.length).toBeGreaterThan(3);
    expect(Math.max(...bindingCounts)).toBeLessThanOrEqual(100);
    expect(Math.max(...inClauseLengths)).toBeLessThanOrEqual(100);
  });
});
