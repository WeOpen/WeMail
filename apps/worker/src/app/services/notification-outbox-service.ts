import type { FeatureToggles, TelegramDeliveryEventId } from "@wemail/shared";

import type { AppBindings, AppStore, NotificationOutboxInput, NotificationOutboxRecord } from "../../core/bindings";
import { defaultFeatureToggles } from "./config-service";
import { shouldSendNotificationToTarget } from "./notification-rule-service";
import { sendTelegramNotification } from "./telegram-service";
import { retryWebhookDelivery, sendWebhookEventToEndpoint } from "./webhook-service";
import { getRuntimeSettings } from "./runtime-settings-service";

type NotificationEventInput = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "telegramEnabled">;
  userId: string;
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
  expiresAt?: string;
  telegramText?: string;
};

function telegramEvent(eventType: string): TelegramDeliveryEventId | null {
  if (eventType === "message.extracted") return "message.extraction.detected";
  if (["message.received", "message.extraction.detected", "api_key.created", "api_key.revoked", "telegram.test"].includes(eventType)) return eventType as TelegramDeliveryEventId;
  return null;
}

export async function planNotificationEvent(input: NotificationEventInput): Promise<NotificationOutboxInput[]> {
  const records: NotificationOutboxInput[] = [];
  const common = {
    messageId: typeof input.data.messageId === "string" ? input.data.messageId : null,
    eventId: input.eventId, userId: input.userId, eventType: input.eventType,
    payloadJson: JSON.stringify({ data: input.data, telegramText: input.telegramText }),
    expiresAt: input.expiresAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString()
  };
  const endpoints = await input.store.webhookEndpoints.listByUser(input.userId);
  for (const endpoint of endpoints) {
    let events: unknown;
    try { events = JSON.parse(endpoint.eventsJson); } catch { continue; }
    if (!endpoint.enabled || !Array.isArray(events) || !events.includes(input.eventType)) continue;
    const target = endpoint.channel ?? "webhook";
    if (await shouldSendNotificationToTarget(input.store, input.userId, { data: input.data, eventType: input.eventType, target, targetId: endpoint.id })) {
      records.push({ ...common, target, targetId: endpoint.id });
    }
  }
  const event = telegramEvent(input.eventType);
  if (input.featureToggles.telegramEnabled && event) {
    const subscription = await input.store.telegram.findByUserId(input.userId);
    if (subscription?.enabled && await shouldSendNotificationToTarget(input.store, input.userId, {
      data: { ...input.data, text: input.telegramText ?? "" }, eventType: event, target: "telegram", targetId: subscription.chatId
    })) records.push({ ...common, target: "telegram", targetId: subscription.chatId });
  }
  return records;
}

export async function enqueueNotificationEvent(input: NotificationEventInput) {
  const planned = await planNotificationEvent(input);
  return Promise.all(planned.map((record) => input.store.notificationOutbox.enqueue(record)));
}

function parsePayload(record: NotificationOutboxRecord) {
  const payload = JSON.parse(record.payloadJson) as { data?: Record<string, unknown>; telegramText?: string };
  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) throw new Error("Original notification event is unavailable");
  return payload;
}

function retryAt(attempts: number, now: Date, retryAfterMs = 0) {
  if (attempts >= 5) return undefined;
  const delay = Math.max(Math.min(30_000 * 2 ** (attempts - 1), 3_600_000), Math.min(retryAfterMs, 3_600_000));
  return new Date(now.getTime() + delay).toISOString();
}

async function dispatchRecord(store: AppStore, env: AppBindings, record: NotificationOutboxRecord, now: Date) {
  if (!record.leaseToken) throw new Error("A delivery lease is required");
  const startedAt = Date.now();
  const completedAt = () => new Date(now.getTime() + Math.max(0, Date.now() - startedAt));
  try {
    const payload = parsePayload(record);
    if (record.target === "telegram") {
      const eventId = telegramEvent(record.eventType);
      const subscription = await store.telegram.findByUserId(record.userId);
      const toggles = await store.settings.getFeatureToggles(defaultFeatureToggles(env));
      if (!eventId || !subscription?.enabled || subscription.chatId !== record.targetId || !toggles.telegramEnabled) {
        await store.notificationOutbox.markFailed(record.id, { leaseToken: record.leaseToken, error: "Telegram target is disabled or has changed", suppressed: true });
        return {};
      }
      const result = await sendTelegramNotification({ store, env, featureToggles: toggles }, {
        userId: record.userId, eventId, text: payload.telegramText ?? "",
        // Delivery audit metadata must not duplicate retained verification codes.
        metadata: { notificationTaskId: record.id, stableEventId: record.eventId, mailboxId: payload.data!.mailboxId, messageId: payload.data!.messageId }
      }, { skipRuleCheck: true });
      if (result.delivered) await store.notificationOutbox.markSucceeded(record.id, record.leaseToken);
      else await store.notificationOutbox.markFailed(record.id, {
        leaseToken: record.leaseToken, error: result.reason ?? "Telegram delivery failed",
        suppressed: result.reason === "notification_rule_suppressed",
        retryAt: result.reason === "telegram_request_failed" || (result.reason === "telegram_api_failed" && (result.statusCode == null || result.statusCode === 408 || result.statusCode === 429 || result.statusCode >= 500)) ? retryAt(record.attempts, completedAt(), result.retryAfterMs) : undefined
      });
      return {};
    }
    const endpoint = (await store.webhookEndpoints.listByUser(record.userId)).find((entry) => entry.id === record.targetId);
    if (!endpoint?.enabled || (endpoint.channel ?? "webhook") !== record.target) {
      await store.notificationOutbox.markFailed(record.id, { leaseToken: record.leaseToken, error: "Webhook target is disabled, removed or has changed", suppressed: true });
      return {};
    }
    const delivery = await sendWebhookEventToEndpoint(store, endpoint, record.eventType, payload.data!, {
      eventId: record.eventId, notificationTaskId: record.id
    });
    if (delivery.status === "success") await store.notificationOutbox.markSucceeded(record.id, record.leaseToken);
    else {
      const canRetry = delivery.statusCode === null || delivery.statusCode === 408 || delivery.statusCode === 429 || delivery.statusCode >= 500;
      await store.notificationOutbox.markFailed(record.id, {
        leaseToken: record.leaseToken, error: delivery.errorText ?? "Webhook delivery failed",
        retryAt: canRetry ? retryAt(record.attempts, completedAt(), delivery.retryAfterMs) : undefined
      });
    }
    return { delivery };
  } catch (error) {
    await store.notificationOutbox.markFailed(record.id, {
      leaseToken: record.leaseToken, error: error instanceof Error ? error.message : "Notification delivery failed",
      retryAt: error instanceof SyntaxError || (error instanceof Error && error.message === "Original notification event is unavailable") ? undefined : retryAt(record.attempts, completedAt())
    });
    return {};
  }
}

export async function processNotificationOutbox(store: AppStore, env: AppBindings, options: { limit?: number; now?: Date } = {}) {
  const now = options.now ?? new Date();
  const settings = await getRuntimeSettings(store, env);
  await store.notificationOutbox.deleteExpired(now.toISOString(), new Date(now.getTime() - settings.message.retentionDays * 86_400_000).toISOString());
  const records = await store.notificationOutbox.claimDue({
    nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(),
    limit: Math.min(Math.max(options.limit ?? 20, 1), 20)
  });
  const startedAt = Date.now();
  // Four requests at a time keep a bounded batch within the two-minute lease,
  // while a failed target cannot prevent other targets from being attempted.
  for (let offset = 0; offset < records.length; offset += 4) {
    await Promise.all(records.slice(offset, offset + 4).map((record) => dispatchRecord(store, env, record, new Date(now.getTime() + Math.max(0, Date.now() - startedAt)))));
  }
  return { claimed: records.length };
}

export async function replayNotificationTask(store: AppStore, env: AppBindings, userId: string, taskId: string) {
  const now = new Date();
  const replayed = await store.notificationOutbox.replay(taskId, userId, now.toISOString());
  if (!replayed) return null;
  const [claimed] = await store.notificationOutbox.claimDue({
    nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(),
    limit: 1, taskId, userId
  });
  if (!claimed) throw new Error("Notification is already being delivered");
  const result = await dispatchRecord(store, env, claimed, now);
  return { ...result, task: (await store.notificationOutbox.listByUser(userId, 500)).find((entry) => entry.id === taskId) ?? replayed };
}

export async function retryWebhookDeliveryWithOutbox(store: AppStore, env: AppBindings, userId: string, deliveryId: string) {
  const delivery = await store.webhookDeliveries.findByUser(deliveryId, userId);
  if (!delivery) return null;
  const payload = JSON.parse(delivery.payloadJson) as { notificationTaskId?: string };
  if (!payload.notificationTaskId) return retryWebhookDelivery(store, userId, deliveryId);
  const replayed = await replayNotificationTask(store, env, userId, payload.notificationTaskId);
  if (!replayed?.delivery) throw new Error("Notification is expired, suppressed or already being delivered");
  return replayed.delivery;
}
