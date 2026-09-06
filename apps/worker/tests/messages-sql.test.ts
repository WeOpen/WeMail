import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { createD1Store } from "../src/infrastructure/persistence/d1";

// The (account_id, message_id) unique index is the race backstop for inbound
// idempotency: two concurrent redeliveries can both pass the pre-check, and
// the loser must surface the winner instead of erroring or double-storing.
// This suite runs the real D1 store statements through node:sqlite.

function createSqliteBackedStore() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE mail_messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      to_address TEXT,
      message_id TEXT,
      from_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      preview_text TEXT NOT NULL,
      body_text TEXT NOT NULL,
      extraction_json TEXT NOT NULL,
      oversize_status TEXT,
      attachment_count INTEGER NOT NULL,
      received_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX idx_mail_messages_account_message_id
      ON mail_messages (account_id, message_id);
    CREATE INDEX idx_mail_messages_account_received
      ON mail_messages (account_id, received_at DESC);
  `);

  const db = {
    prepare(sql: string) {
      let bound: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          bound = values;
          return statement;
        },
        async first<T>() {
          const row = sqlite.prepare(sql).get(...(bound as never[])) as T | undefined;
          return row ?? null;
        },
        async all() {
          const results = sqlite.prepare(sql).all(...(bound as never[])) as unknown[];
          return { results };
        },
        async run() {
          sqlite.prepare(sql).run(...(bound as never[]));
          return { success: true };
        }
      };
      return statement;
    }
  } as unknown as D1Database;
  return { store: createD1Store(db), sqlite };
}

const baseInput = {
  mailboxId: "mailbox-1",
  toAddress: "ops@example.com",
  fromAddress: "sender@example.com",
  subject: "Race check",
  previewText: "preview",
  bodyText: "body",
  extractionJson: "{}",
  oversizeStatus: null,
  attachmentCount: 0,
  receivedAt: "2026-09-05T12:00:00.000Z",
  expiresAt: "2026-09-12T12:00:00.000Z"
};

describe("D1 inbound message-id idempotency", () => {
  it("returns the existing row when a concurrent create hits the unique index", async () => {
    const { store, sqlite } = createSqliteBackedStore();
    try {
      const first = await store.messages.create({ ...baseInput, messageId: "<race-1@example.com>" });
      // Second insert with the same (account_id, message_id) loses the race;
      // create() must hand back the winner instead of throwing.
      const second = await store.messages.create({ ...baseInput, messageId: "<race-1@example.com>" });

      expect(second.id).toBe(first.id);
      const rows = sqlite.prepare("SELECT COUNT(*) AS n FROM mail_messages").get() as { n: number };
      expect(rows.n).toBe(1);
    } finally {
      sqlite.close();
    }
  });

  it("treats NULL message-ids as distinct so headerless mail is unconstrained", async () => {
    const { store, sqlite } = createSqliteBackedStore();
    try {
      await store.messages.create({ ...baseInput, messageId: null });
      await store.messages.create({ ...baseInput, messageId: null });

      const rows = sqlite.prepare("SELECT COUNT(*) AS n FROM mail_messages").get() as { n: number };
      expect(rows.n).toBe(2);
    } finally {
      sqlite.close();
    }
  });

  it("finds a stored message by mailbox and Message-ID", async () => {
    const { store, sqlite } = createSqliteBackedStore();
    try {
      const created = await store.messages.create({ ...baseInput, messageId: "<lookup-1@example.com>" });
      const found = await store.messages.findByMailboxAndMessageId("mailbox-1", "<lookup-1@example.com>");

      expect(found?.id).toBe(created.id);
      expect(await store.messages.findByMailboxAndMessageId("mailbox-1", "<missing@example.com>")).toBeNull();
      expect(await store.messages.findByMailboxAndMessageId("mailbox-other", "<lookup-1@example.com>")).toBeNull();
    } finally {
      sqlite.close();
    }
  });

  it("bounds the recent-content fallback to the duplicate window", async () => {
    const { store, sqlite } = createSqliteBackedStore();
    try {
      await store.messages.create({ ...baseInput, receivedAt: "2026-09-05T11:50:00.000Z", messageId: null });
      await store.messages.create({ ...baseInput, receivedAt: "2026-09-05T11:30:00.000Z", messageId: null });

      const since = "2026-09-05T11:45:00.000Z";
      const recent = await store.messages.listRecentByMailbox("mailbox-1", since);
      expect(recent).toHaveLength(1);
      expect(recent[0]?.receivedAt).toBe("2026-09-05T11:50:00.000Z");
    } finally {
      sqlite.close();
    }
  });
});
