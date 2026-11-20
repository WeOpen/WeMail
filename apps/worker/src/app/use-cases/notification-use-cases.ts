import type { NotificationDeliverySummary, NotificationRuleTarget } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { evaluateNotificationRules, isSupportedNotificationEvent } from "../services/notification-rule-service";
import { replayNotificationTask } from "../services/notification-outbox-service";
import { recordAudit } from "../services/audit-service";

const targets: NotificationRuleTarget[] = ["webhook", "telegram", "slack", "discord", "feishu", "wecom"];

export function parseNotificationTarget(value?: string): NotificationRuleTarget | undefined {
  if (!value) return undefined;
  if (!targets.includes(value as NotificationRuleTarget)) throw new Error("Unsupported notification target");
  return value as NotificationRuleTarget;
}

export async function getNotificationStatus(store: AppStore, userId: string, options: { target?: NotificationRuleTarget; admin?: boolean } = {}) {
  const [summary, tasks, endpoints] = await Promise.all([
    store.notificationOutbox.summarize(options.admin ? undefined : userId, options.target),
    options.admin ? store.notificationOutbox.listRecent(30) : store.notificationOutbox.listByUser(userId, 30, options.target),
    options.admin ? Promise.resolve([]) : store.webhookEndpoints.listByUser(userId)
  ]);
  const names = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint.name]));
  const deliveries: NotificationDeliverySummary[] = tasks.map((task) => ({
    id: task.id, eventId: task.eventId, eventType: task.eventType, target: task.target, targetId: task.targetId,
    targetName: task.target === "telegram" ? "Telegram" : names.get(task.targetId) ?? task.target,
    status: task.status, attempts: task.attempts, nextAttemptAt: task.nextAttemptAt, errorText: task.lastError,
    createdAt: task.createdAt, updatedAt: task.updatedAt, expiresAt: task.expiresAt
  }));
  return { summary, deliveries };
}

export async function retryNotification(store: AppStore, env: AppBindings, userId: string, taskId: string) {
  const result = await replayNotificationTask(store, env, userId, taskId);
  if (result) await recordAudit(store, "user", userId, "notification-replay", { taskId });
  return result ? getNotificationStatus(store, userId) : null;
}

export async function testNotificationRules(store: AppStore, userId: string, value: unknown) {
  if (!value || typeof value !== "object") throw new Error("A notification sample is required");
  const input = value as { target?: string; targetId?: string; eventType?: string; data?: Record<string, unknown>; evaluatedAt?: string };
  const target = parseNotificationTarget(input.target);
  if (!target || !isSupportedNotificationEvent(input.eventType)) throw new Error("A supported target and event type are required");
  const data = input.data && typeof input.data === "object" && !Array.isArray(input.data) ? input.data : {};
  if (typeof data.mailboxId === "string" && data.mailboxId) {
    const mailbox = await store.mailboxes.findById(data.mailboxId);
    if (!mailbox || mailbox.userId !== userId) throw new Error("Mailbox is unavailable for this account");
  }
  const now = input.evaluatedAt ? new Date(input.evaluatedAt) : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("A valid evaluation time is required");
  return evaluateNotificationRules(store, userId, { data, target, eventType: input.eventType, targetId: input.targetId, now });
}
