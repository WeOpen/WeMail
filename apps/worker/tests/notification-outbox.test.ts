import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueNotificationEvent, processNotificationOutbox } from "../src/app/services/notification-outbox-service";
import { processInboundEmail } from "../src/app/runtime";
import { createInMemoryStore } from "../src/infrastructure/persistence/in-memory";

const featureToggles = { telegramEnabled: false } as const;

async function createWebhookFixture() {
  const store = createInMemoryStore();
  const endpoint = await store.webhookEndpoints.create({
    userId: "user-1",
    name: "Recovery webhook",
    url: "https://hooks.example.test/recovery",
    channel: "webhook",
    eventsJson: JSON.stringify(["message.extracted"]),
    enabled: true
  });
  return { store, endpoint };
}

describe("notification outbox", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("enqueues one durable intent per target and is idempotent for a repeated event", async () => {
    const { store, endpoint } = await createWebhookFixture();
    const input = {
      store,
      featureToggles,
      userId: "user-1",
      eventId: "message:1:extracted",
      eventType: "message.extracted",
      data: { mailboxId: "mailbox-1", extraction: { value: "654321" } },
      telegramText: "验证码 654321"
    };

    const first = await enqueueNotificationEvent(input);
    const second = await enqueueNotificationEvent(input);

    expect(first).toHaveLength(1);
    expect(first[0].targetId).toBe(endpoint.id);
    expect(second[0].id).toBe(first[0].id);
    expect(await store.notificationOutbox.listByUser("user-1")).toHaveLength(1);
  });

  it("keeps a failed delivery retryable and recovers it after the provider returns", async () => {
    const { store } = await createWebhookFixture();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("provider unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const [queued] = await enqueueNotificationEvent({
      store,
      featureToggles,
      userId: "user-1",
      eventId: "message:2:extracted",
      eventType: "message.extracted",
      data: { subject: "Verify", extraction: { value: "482914" } }
    });

    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" });
    const failed = (await store.notificationOutbox.listByUser("user-1"))[0];
    expect(failed).toMatchObject({ id: queued.id, status: "retrying", attempts: 1 });
    expect(failed.lastError).toMatch(/HTTP 503/);

    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" }, { now: new Date(failed.nextAttemptAt) });
    expect((await store.notificationOutbox.listByUser("user-1"))[0]).toMatchObject({ status: "succeeded", attempts: 2, lastError: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks a permanently failing target after the bounded attempt count", async () => {
    const { store } = await createWebhookFixture();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async () => new Response("down", { status: 503 })));
    const [queued] = await enqueueNotificationEvent({
      store,
      featureToggles,
      userId: "user-1",
      eventId: "message:3:extracted",
      eventType: "message.extracted",
      data: { extraction: { value: "111111" } }
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const task = (await store.notificationOutbox.listByUser("user-1")).find((entry) => entry.id === queued.id)!;
      await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" }, { now: new Date(task.nextAttemptAt) });
    }
    expect((await store.notificationOutbox.listByUser("user-1"))[0]).toMatchObject({ status: "failed", attempts: 5 });
  });

  it("respects Retry-After and treats a permanent HTTP rejection as terminal", async () => {
    const { store } = await createWebhookFixture();
    const now = new Date();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "retry-after": "120" } }))
      .mockResolvedValueOnce(new Response("invalid target", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    await enqueueNotificationEvent({ store, featureToggles, userId: "user-1", eventId: "rate-limited", eventType: "message.extracted", data: {} });
    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" }, { now: new Date(now.getTime() + 10) });
    const retry = (await store.notificationOutbox.listByUser("user-1"))[0];
    expect(new Date(retry.nextAttemptAt).getTime() - now.getTime()).toBeGreaterThanOrEqual(120_000);
    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" }, { now: new Date(retry.nextAttemptAt) });
    expect((await store.notificationOutbox.listByUser("user-1"))[0].status).toBe("failed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers a claimed but interrupted task with the same event id", async () => {
    const { store } = await createWebhookFixture();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await enqueueNotificationEvent({ store, featureToggles, userId: "user-1", eventId: "stable-event", eventType: "message.extracted", data: { extraction: { value: "654321" } } });
    const now = new Date();
    const [abandoned] = await store.notificationOutbox.claimDue({ nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(), limit: 1 });
    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" }, { now: new Date(now.getTime() + 121_000) });
    const task = (await store.notificationOutbox.listByUser("user-1"))[0];
    expect(task).toMatchObject({ id: abandoned.id, status: "succeeded", attempts: 2 });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("x-wemail-event-id")).toBe("stable-event");
  });

  it("attempts healthy targets even when another target fails", async () => {
    const { store } = await createWebhookFixture();
    await store.webhookEndpoints.create({ userId: "user-1", name: "Healthy", url: "https://hooks.example.test/healthy", channel: "webhook", eventsJson: '["message.extracted"]', enabled: true });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async (url) => new Response("ok", { status: String(url).includes("healthy") ? 200 : 503 })));
    await enqueueNotificationEvent({ store, featureToggles, userId: "user-1", eventId: "fan-out", eventType: "message.extracted", data: {} });
    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session" });
    expect((await store.notificationOutbox.listByUser("user-1")).map((entry) => entry.status).sort()).toEqual(["retrying", "succeeded"]);
  });

  it("keeps committed mail and tasks when dispatch fails, then suppresses duplicate inbound events", async () => {
    const { store } = await createWebhookFixture();
    const mailbox = await store.mailboxes.create({ userId: "user-1", address: "codes@example.com", label: "Codes" });
    const claim = vi.spyOn(store.notificationOutbox, "claimDue").mockRejectedValueOnce(new Error("Injected dispatcher interruption"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const env = { APP_NAME: "WeMail", COOKIE_NAME: "session", ENABLE_AI: "false", ENABLE_TELEGRAM: "false" };
    const raw = `From: sender@example.net\r\nTo: ${mailbox.address}\r\nMessage-ID: <durable@example.net>\r\nSubject: Your verification code\r\nContent-Type: text/plain\r\n\r\nYour verification code is 654321`;
    const deferred: Promise<unknown>[] = [];
    const message = await processInboundEmail(env, store, { to: mailbox.address, raw: new Blob([raw]).stream() }, { deferNotifications: (work) => deferred.push(work) });
    await Promise.all(deferred);
    expect(await store.messages.findById(message.id)).not.toBeNull();
    const [task] = await store.notificationOutbox.listByUser("user-1");
    expect(task).toMatchObject({ messageId: message.id, status: "pending", attempts: 0, expiresAt: message.expiresAt });
    claim.mockRestore();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ ok: true })));
    await processNotificationOutbox(store, env);
    const repeated = await processInboundEmail(env, store, { to: mailbox.address, raw: new Blob([raw]).stream() });
    expect(repeated.id).toBe(message.id);
    expect(await store.notificationOutbox.listByUser("user-1")).toHaveLength(1);
    expect((await store.notificationOutbox.listByUser("user-1"))[0].status).toBe("succeeded");
    await store.messages.deleteMany([message.id]);
    expect(await store.notificationOutbox.listByUser("user-1")).toHaveLength(0);
    expect(await store.webhookDeliveries.listByUser("user-1")).toHaveLength(0);
  });

  it("delivers extracted Telegram events using the existing alias and keeps codes out of audit metadata", async () => {
    const { store } = await createWebhookFixture();
    await store.telegram.upsert({ userId: "user-1", chatId: "12345", enabled: true });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ ok: true })));
    const now = new Date();
    await enqueueNotificationEvent({ store, featureToggles: { telegramEnabled: true }, userId: "user-1", eventId: "telegram-extraction", eventType: "message.extracted", data: { extraction: { value: "654321" } }, telegramText: "验证码 654321", expiresAt: new Date(now.getTime() + 60_000).toISOString() });
    await processNotificationOutbox(store, { APP_NAME: "WeMail", COOKIE_NAME: "session", ENABLE_TELEGRAM: "true", TELEGRAM_BOT_TOKEN: "test-token" });
    expect((await store.notificationOutbox.listByUser("user-1")).map((entry) => entry.status)).toEqual(["succeeded", "succeeded"]);
    expect((await store.audit.listRecent()).every((entry) => !entry.payloadJson.includes("654321"))).toBe(true);
    await store.notificationOutbox.deleteExpired(new Date(now.getTime() + 61_000).toISOString());
    expect(await store.notificationOutbox.listByUser("user-1")).toHaveLength(0);
    expect(await store.webhookDeliveries.listByUser("user-1")).toHaveLength(0);
  });
});
