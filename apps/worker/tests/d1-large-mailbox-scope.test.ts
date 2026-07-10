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
});
