import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createD1Store } from "../src/infrastructure/persistence/d1";

const migrationDirectory = "src/infrastructure/db/migrations";
const migrations = readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")).sort();

function applyMigrations(sqlite: DatabaseSync, names = migrations) {
  for (const name of names) sqlite.exec(readFileSync(`${migrationDirectory}/${name}`, "utf8"));
}

function databaseShape(sqlite: DatabaseSync) {
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  return {
    tables: tables.map(({ name }) => ({
      name,
      columns: sqlite.prepare(`PRAGMA table_info('${String(name)}')`).all()
        .map(({ name: columnName, type, notnull, dflt_value, pk }) => ({ name: columnName, type, notnull, dflt_value, pk }))
        .sort((first, second) => String(first.name).localeCompare(String(second.name))),
      indexes: sqlite.prepare(`PRAGMA index_list('${String(name)}')`).all().map((index) => ({
        name: index.name,
        unique: index.unique,
        columns: sqlite.prepare(`PRAGMA index_info('${String(index.name)}')`).all().map((column) => column.name)
      })).sort((first, second) => String(first.name).localeCompare(String(second.name)))
    })),
    indexes: sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
  };
}

function createSqliteStore(sqlite: DatabaseSync) {
  let transactionTail: Promise<unknown> = Promise.resolve();
  const db = {
    batch(statements: Array<{ all: () => Promise<{ results: unknown[] }> }>) {
      const result = transactionTail.then(async () => {
        sqlite.exec("BEGIN");
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.all());
          sqlite.exec("COMMIT"); return results;
        } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      });
      transactionTail = result.then(() => undefined, () => undefined);
      return result;
    },
    prepare(sql: string) {
      let bindings: SQLInputValue[] = [];
      const statement = {
        bind(...values: SQLInputValue[]) { bindings = values; return statement; },
        async first<T>() { return (sqlite.prepare(sql).get(...bindings) as T | undefined) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...bindings) }; },
        async run() { sqlite.prepare(sql).run(...bindings); return { success: true }; }
      };
      return statement;
    }
  } as unknown as D1Database;
  return createD1Store(db);
}

describe("database migrations", () => {
  it("initializes an empty database and keeps the local schema snapshot in sync", () => {
    const migrated = new DatabaseSync(":memory:");
    const snapshot = new DatabaseSync(":memory:");
    try {
      applyMigrations(migrated);
      snapshot.exec(readFileSync("src/infrastructure/db/schema.sql", "utf8"));
      expect(databaseShape(snapshot)).toEqual(databaseShape(migrated));
    } finally {
      migrated.close();
      snapshot.close();
    }
  });

  it("upgrades existing delivery records without losing canonical events and persists the request body separately", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite, migrations.filter((name) => name < "0024"));
      sqlite.exec("INSERT INTO webhook_endpoints (id, user_id, name, url, events_json, signing_secret, enabled, created_at, updated_at) VALUES ('endpoint-1', 'user-1', 'Legacy', 'https://hooks.example.test', '[]', 'test-secret', 1, '2026-10-03', '2026-10-03')");
      const legacyPayload = JSON.stringify({ eventType: "message.received", data: { subject: "Legacy subject" } });
      sqlite.prepare("INSERT INTO webhook_deliveries (id, endpoint_id, event_type, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run("legacy-1", "endpoint-1", "message.received", "failed", legacyPayload, "2026-10-03");
      applyMigrations(sqlite, migrations.filter((name) => name >= "0024"));
      const store = createSqliteStore(sqlite);
      await expect(store.webhookDeliveries.findByUser("legacy-1", "user-1")).resolves.toMatchObject({
        payloadJson: legacyPayload, requestBodyText: null
      });
      await store.webhookDeliveries.record({
        id: "new-1", endpointId: "endpoint-1", eventType: "message.received", status: "success",
        statusCode: 200, durationMs: 10, errorText: null, payloadJson: legacyPayload,
        requestBodyText: JSON.stringify({ text: "Legacy subject" }), responseText: "ok"
      });
      const delivery = await store.webhookDeliveries.findByUser("new-1", "user-1");
      expect(delivery).toMatchObject({ payloadJson: legacyPayload, requestBodyText: '{"text":"Legacy subject"}' });
      expect((await store.webhookDeliveries.listByUser("user-1")).find((record) => record.id === "new-1")).toEqual(delivery);
      expect((await store.webhookDeliveries.listByUserPage("user-1", { page: 1, pageSize: 10 })).deliveries.find((record) => record.id === "new-1")).toEqual(delivery);
      await expect(store.webhookDeliveries.findByUser("new-1", "other-user")).resolves.toBeNull();
    } finally {
      sqlite.close();
    }
  });

  it("persists, claims, retries, and completes notification outbox tasks in D1", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const queued = await store.notificationOutbox.enqueue({
        eventId: "message:db-1:received",
        userId: "user-1",
        target: "webhook",
        targetId: "endpoint-1",
        eventType: "message.received",
        payloadJson: JSON.stringify({ data: { subject: "D1 recovery" } }),
        nextAttemptAt: "2026-10-05T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z"
      });
      const duplicate = await store.notificationOutbox.enqueue({
        eventId: "message:db-1:received",
        userId: "user-1",
        target: "webhook",
        targetId: "endpoint-1",
        eventType: "message.received",
        payloadJson: JSON.stringify({ data: { subject: "D1 recovery" } }),
        expiresAt: "2099-01-01T00:00:00.000Z"
      });
      expect(duplicate.id).toBe(queued.id);
      const [claimed] = await store.notificationOutbox.claimDue({
        nowIso: "2026-10-05T00:00:00.000Z",
        lockBeforeIso: "2026-10-04T23:55:00.000Z",
        limit: 10
      });
      expect(claimed).toMatchObject({ id: queued.id, status: "processing", attempts: 1 });
      await store.notificationOutbox.markFailed(queued.id, {
        leaseToken: claimed.leaseToken!,
        error: "temporary provider failure",
        retryAt: "2026-10-05T00:01:00.000Z"
      });
      expect(await store.notificationOutbox.listByUser("user-1")).toMatchObject([
        expect.objectContaining({ status: "retrying", lastError: "temporary provider failure" })
      ]);
      const [reclaimed] = await store.notificationOutbox.claimDue({
        nowIso: "2026-10-05T00:02:00.000Z",
        lockBeforeIso: "2026-10-04T23:57:00.000Z",
        limit: 10
      });
      expect(reclaimed.attempts).toBe(2);
      await store.notificationOutbox.markSucceeded(queued.id, reclaimed.leaseToken!);
      expect(await store.notificationOutbox.listByUser("user-1")).toMatchObject([
        expect.objectContaining({ status: "succeeded", attempts: 2, lastError: null })
      ]);
    } finally {
      sqlite.close();
    }
  });

  it("rolls back a mail insert when its notification intent cannot commit", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      sqlite.exec("CREATE TRIGGER reject_notifications BEFORE INSERT ON notification_outbox BEGIN SELECT RAISE(ABORT, 'injected outbox failure'); END");
      const store = createSqliteStore(sqlite);
      await expect(store.messages.create({
        mailboxId: "mailbox-1", messageId: "<atomic@example.net>", fromAddress: "sender@example.net", subject: "Atomic mail",
        previewText: "验证码 654321", bodyText: "验证码 654321", extractionJson: "{}", oversizeStatus: null,
        attachmentCount: 0, receivedAt: new Date().toISOString(), expiresAt: "2099-01-01T00:00:00.000Z"
      }, { id: "atomic-mail", notificationTasks: [{
        eventId: "message:atomic-mail:received", userId: "user-1", target: "webhook", targetId: "endpoint-1", eventType: "message.received",
        payloadJson: '{"data":{"messageId":"atomic-mail"}}', expiresAt: "2099-01-01T00:00:00.000Z"
      }] })).rejects.toThrow("injected outbox failure");
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM mail_messages").get()?.count).toBe(0);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM notification_outbox").get()?.count).toBe(0);
    } finally { sqlite.close(); }
  });

  it("claims once under concurrency and rejects completion by an expired lease owner", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const task = await store.notificationOutbox.enqueue({
        eventId: "concurrent-event", userId: "owner", target: "webhook", targetId: "endpoint", eventType: "message.received",
        payloadJson: '{"data":{}}', nextAttemptAt: "2026-10-05T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z"
      });
      const input = { nowIso: "2026-10-05T00:01:00.000Z", lockBeforeIso: "2026-10-04T23:59:00.000Z", limit: 20 };
      const claims = (await Promise.all([store.notificationOutbox.claimDue(input), store.notificationOutbox.claimDue(input)])).flat();
      expect(claims).toHaveLength(1);
      const [reclaimed] = await store.notificationOutbox.claimDue({ ...input, nowIso: "2026-10-05T00:05:00.000Z", lockBeforeIso: "2026-10-05T00:03:00.000Z" });
      expect(reclaimed.leaseToken).not.toBe(claims[0].leaseToken);
      await store.notificationOutbox.markSucceeded(task.id, claims[0].leaseToken!);
      expect((await store.notificationOutbox.listByUser("owner"))[0].status).toBe("processing");
      await store.notificationOutbox.markSucceeded(task.id, reclaimed.leaseToken!);
      expect((await store.notificationOutbox.listByUser("owner"))[0].status).toBe("succeeded");
      expect(await store.notificationOutbox.replay(task.id, "other-user", input.nowIso)).toBeNull();
    } finally { sqlite.close(); }
  });

  it("counts all tasks beyond the bounded recent list and preserves UTC during rule upgrades", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite, migrations.filter((name) => name < "0026"));
      sqlite.exec("INSERT INTO notification_rules (id, user_id, name, enabled, target, event_types_json, mailbox_ids_json, keyword, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES ('legacy-rule', 'owner', 'Legacy UTC', 1, 'webhook', '[\"message.received\"]', '[]', '', '23:00', '07:00', '2026-10-01', '2026-10-01')");
      applyMigrations(sqlite, migrations.filter((name) => name >= "0026"));
      const store = createSqliteStore(sqlite);
      expect((await store.notificationRules.listByUser("owner"))[0].quietHoursTimezone).toBe("UTC");
      for (let index = 0; index < 35; index += 1) await store.notificationOutbox.enqueue({
        eventId: `count-${index}`, userId: "owner", target: "webhook", targetId: "endpoint", eventType: "message.received", payloadJson: '{"data":{}}', expiresAt: "2099-01-01T00:00:00.000Z"
      });
      expect(await store.notificationOutbox.listByUser("owner", 30)).toHaveLength(30);
      expect((await store.notificationOutbox.summarize("owner")).backlogCount).toBe(35);
      expect((await store.notificationOutbox.summarize("other-user")).backlogCount).toBe(0);
    } finally { sqlite.close(); }
  });

  it("removes retained verification payloads when a source message is deleted and expires unlinked legacy logs", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const endpoint = await store.webhookEndpoints.create({ userId: "owner", name: "Slack", url: "https://hooks.example.test", channel: "slack", eventsJson: '[]', enabled: true });
      expect((await store.webhookEndpoints.listByUserPage("owner", { page: 1, pageSize: 5 })).endpoints[0].channel).toBe("slack");
      const message = await store.messages.create({
        mailboxId: "mailbox", fromAddress: "sender@example.net", subject: "Code", bodyText: "654321", previewText: "654321", extractionJson: "{}", oversizeStatus: null, attachmentCount: 0, receivedAt: new Date().toISOString(), expiresAt: "2099-01-01T00:00:00.000Z"
      }, { id: "cleanup-message", notificationTasks: [{
        messageId: "cleanup-message", eventId: "cleanup-event", userId: "owner", target: "slack", targetId: endpoint.id, eventType: "message.extracted", payloadJson: '{"data":{"messageId":"cleanup-message","code":"654321"}}', expiresAt: "2099-01-01T00:00:00.000Z"
      }] });
      const [task] = await store.notificationOutbox.listByUser("owner");
      await store.webhookDeliveries.record({ endpointId: endpoint.id, eventType: "message.extracted", status: "failed", statusCode: 503, durationMs: 1, errorText: null, responseText: null, payloadJson: JSON.stringify({ notificationTaskId: task.id, data: { code: "654321" } }) });
      await store.messages.deleteMany([message.id]);
      expect(await store.notificationOutbox.listByUser("owner")).toHaveLength(0);
      expect(await store.webhookDeliveries.listByUser("owner")).toHaveLength(0);
      await store.webhookDeliveries.record({ endpointId: endpoint.id, eventType: "message.extracted", status: "failed", statusCode: 503, durationMs: 1, errorText: null, responseText: null, payloadJson: '{"text":"legacy 654321"}', createdAt: "2000-01-01T00:00:00.000Z" });
      await store.notificationOutbox.deleteExpired(new Date().toISOString(), "2001-01-01T00:00:00.000Z");
      expect(await store.webhookDeliveries.listByUser("owner")).toHaveLength(0);
    } finally { sqlite.close(); }
  });

  it("accepts an idempotent outbound request once and enforces quota under concurrent keys", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const input = { userId: "sender", requestId: "same-key", requestHash: "same-content", mailboxId: "mailbox", fromAddress: "from@example.com", toAddress: "to@example.net", subject: "Atomic send", bodyText: "Payload", requestPayloadJson: '{"text":"Payload"}', maxAttempts: 3, retryDelayMs: 300_000 };
      const limits = { dailyLimit: 2, apiDailyLimit: 100 };
      const [first, duplicate] = await Promise.all([store.outboundSends.accept(input, limits), store.outboundSends.accept(input, limits)]);
      expect(first?.id).toBe(duplicate?.id);
      expect((await store.quotas.getByUserId("sender", 2, 100)).sendsToday).toBe(1);
      const remaining = await Promise.all([store.outboundSends.accept({ ...input, requestId: "second" }, limits), store.outboundSends.accept({ ...input, requestId: "third" }, limits)]);
      expect(remaining.filter(Boolean)).toHaveLength(1);
      expect((await store.quotas.getByUserId("sender", 2, 100)).sendsToday).toBe(2);
      expect(await store.outboundSends.findByUserAndKey("other-user", "same-key")).toBeNull();
    } finally { sqlite.close(); }
  });

  it("rolls back quota and outbound history together if the send record fails", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      sqlite.exec("CREATE TRIGGER reject_outbound BEFORE INSERT ON mail_outbound_messages BEGIN SELECT RAISE(ABORT, 'outbound write failed'); END");
      await expect(store.outboundSends.accept({ userId: "sender", requestId: "key", requestHash: "hash", mailboxId: "mailbox", fromAddress: "from@example.com", toAddress: "to@example.net", subject: "Atomic", bodyText: "Body", requestPayloadJson: '{}', maxAttempts: 1, retryDelayMs: 0 }, { dailyLimit: 1, apiDailyLimit: 100 })).rejects.toThrow("outbound write failed");
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM user_send_quotas").get()?.count).toBe(0);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM mail_outbound_messages").get()?.count).toBe(0);
    } finally { sqlite.close(); }
  });

  it("reconciles early provider events, deduplicates callbacks and prevents state regression", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const record = await store.outboundSends.accept({ userId: "sender", requestId: "event-key", requestHash: "hash", mailboxId: "mailbox", fromAddress: "from@example.com", toAddress: "to@example.net", subject: "Events", bodyText: "Body", requestPayloadJson: '{}', maxAttempts: 3, retryDelayMs: 0 }, { dailyLimit: 10, apiDailyLimit: 100 });
      const now = new Date();
      const [task] = await store.outboundSends.claimDue({ nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(), limit: 1 });
      const delivered = { id: "svix-delivered", providerMessageId: "provider-early", type: "email.delivered", status: "delivered" as const, occurredAt: now.toISOString(), detail: null };
      await store.outboundSends.recordProviderEvent(delivered);
      await store.outboundSends.complete(record!.id, { leaseToken: task.leaseToken!, status: "accepted", providerMessageId: "provider-early", nowIso: now.toISOString() });
      expect((await store.outboundMessages.findById(record!.id))?.status).toBe("delivered");
      await store.outboundSends.recordProviderEvent(delivered);
      await store.outboundSends.recordProviderEvent({ ...delivered, id: "late-sent", type: "email.sent", status: "accepted", occurredAt: new Date(now.getTime() + 5000).toISOString() });
      expect((await store.outboundMessages.findById(record!.id))?.status).toBe("delivered");
      expect((await store.outboundSends.timeline(record!.id)).filter((event) => event.type === "email.delivered")).toHaveLength(1);
    } finally { sqlite.close(); }
  });

  it("retains historical sent records across the outbound migration and exposes their event timeline", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite, migrations.filter((name) => name < "0027"));
      sqlite.exec("INSERT INTO mail_outbound_messages (id, account_id, to_address, subject, status, created_at) VALUES ('legacy-send', 'mailbox', 'old@example.net', 'Historical send', 'sent', '2026-10-01T00:00:00.000Z')");
      applyMigrations(sqlite, migrations.filter((name) => name >= "0027"));
      const store = createSqliteStore(sqlite);
      expect(await store.outboundMessages.findById("legacy-send")).toMatchObject({ status: "sent", attempts: 0, payloadRetained: true });
      expect((await store.outboundMessages.listByMailbox({ mailboxId: "mailbox", page: 1, pageSize: 10, status: "sent" })).total).toBe(1);
      await store.outboundSends.recordProviderEvent({ id: "orphan-old", providerMessageId: "unlinked-provider", type: "email.bounced", status: "bounced", occurredAt: "2026-10-01T00:00:00.000Z", detail: "Retained sensitive reason" });
      await store.outboundSends.cleanup("2026-10-02T00:00:00.000Z");
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM mail_outbound_events").get()?.count).toBe(0);
    } finally { sqlite.close(); }
  });

  it("recovers outbound leases once, preserves unknown submissions and rejects stale completions", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const record = await store.outboundSends.accept({ userId: "sender", requestId: "lease-key", requestHash: "hash", mailboxId: "mailbox", fromAddress: "from@example.com", toAddress: "to@example.net", subject: "Leases", bodyText: "Body", requestPayloadJson: '{}', maxAttempts: 3, retryDelayMs: 0 }, { dailyLimit: 10, apiDailyLimit: 100 });
      const now = new Date();
      const input = { nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(), limit: 1 };
      const claims = (await Promise.all([store.outboundSends.claimDue(input), store.outboundSends.claimDue(input)])).flat();
      expect(claims).toHaveLength(1);
      const later = new Date(now.getTime() + 121_000);
      const [reclaimed] = await store.outboundSends.claimDue({ ...input, nowIso: later.toISOString(), lockBeforeIso: new Date(later.getTime() - 120_000).toISOString() });
      expect(reclaimed).toMatchObject({ attempts: 2, submissionUncertain: true });
      expect(reclaimed.leaseToken).not.toBe(claims[0].leaseToken);
      await store.outboundSends.complete(record!.id, { leaseToken: claims[0].leaseToken!, status: "failed", nowIso: later.toISOString() });
      expect((await store.outboundMessages.findById(record!.id))?.status).toBe("sending");
      await store.outboundSends.complete(record!.id, { leaseToken: reclaimed.leaseToken!, status: "queued", submissionUncertain: true, nextAttemptAt: later.toISOString(), nowIso: later.toISOString() });
      expect((await store.outboundSends.findByUserAndKey("sender", "lease-key"))?.submissionUncertain).toBe(true);
      await store.outboundSends.claimDue({ ...input, nowIso: new Date(now.getTime() + 23 * 3_600_000).toISOString() });
      expect((await store.outboundMessages.findById(record!.id))?.status).toBe("uncertain");
    } finally { sqlite.close(); }
  });


  it("rolls back outbound acceptance when early callback reconciliation cannot commit", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      applyMigrations(sqlite);
      const store = createSqliteStore(sqlite);
      const record = await store.outboundSends.accept({ userId: "sender", requestId: "atomic-early-callback", requestHash: "hash", mailboxId: "mailbox", fromAddress: "from@example.com", toAddress: "to@example.net", subject: "Early callback", bodyText: "Body", requestPayloadJson: '{}', maxAttempts: 3, retryDelayMs: 0 }, { dailyLimit: 10, apiDailyLimit: 100 });
      const now = new Date();
      const [task] = await store.outboundSends.claimDue({ nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(), limit: 1 });
      await store.outboundSends.recordProviderEvent({ id: "atomic-delivered", providerMessageId: "atomic-provider", type: "email.delivered", status: "delivered", occurredAt: now.toISOString(), detail: null });
      sqlite.exec("CREATE TRIGGER reject_reconciliation BEFORE UPDATE OF status ON mail_outbound_messages WHEN NEW.status = 'delivered' BEGIN SELECT RAISE(ABORT, 'injected reconciliation failure'); END");
      const completion = { leaseToken: task.leaseToken!, status: "accepted" as const, providerMessageId: "atomic-provider", nowIso: now.toISOString() };
      await expect(store.outboundSends.complete(record!.id, completion)).rejects.toThrow("injected reconciliation failure");
      expect(await store.outboundSends.findByUserAndKey("sender", "atomic-early-callback")).toMatchObject({ status: "sending", providerMessageId: null, leaseToken: task.leaseToken });
      expect(await store.outboundSends.timeline(record!.id)).toHaveLength(0);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM mail_outbound_events WHERE event_type = 'email.delivered'").get()?.count).toBe(1);
      sqlite.exec("DROP TRIGGER reject_reconciliation");
      const later = new Date(now.getTime() + 121_000);
      const [reclaimed] = await store.outboundSends.claimDue({ nowIso: later.toISOString(), lockBeforeIso: new Date(later.getTime() - 120_000).toISOString(), limit: 1 });
      expect(reclaimed.id).toBe(record!.id);
      await store.outboundSends.complete(record!.id, { ...completion, leaseToken: reclaimed.leaseToken!, nowIso: later.toISOString() });
      expect(await store.outboundMessages.findById(record!.id)).toMatchObject({ status: "delivered", providerMessageId: "atomic-provider" });
      expect((await store.quotas.getByUserId("sender", 10, 100)).sendsToday).toBe(1);
    } finally { sqlite.close(); }
  });

});
