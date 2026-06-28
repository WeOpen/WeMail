import type { NotificationRuleInput, NotificationRuleSummary, NotificationRuleTarget } from "@wemail/shared";

import type { AppStore, NotificationRuleRecord } from "../../core/bindings";

const notificationTargets = new Set<NotificationRuleTarget>(["webhook", "telegram", "slack", "discord", "feishu", "wecom"]);
const notificationEvents = new Set([
  "message.received",
  "message.extracted",
  "message.extraction.detected",
  "message.failed",
  "telegram.sent",
  "telegram.failed",
  "telegram.test",
  "api_key.created",
  "api_key.revoked",
  "settings.updated"
]);

function parseJsonStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function normalizeStringList(values: unknown[] | undefined, options?: { allowed?: Set<string>; maxItems?: number }) {
  const normalized: string[] = [];
  for (const value of values ?? []) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || normalized.includes(trimmed)) continue;
    if (options?.allowed && !options.allowed.has(trimmed)) throw new Error(`Unsupported notification value: ${trimmed}`);
    normalized.push(trimmed);
    if (options?.maxItems && normalized.length >= options.maxItems) break;
  }
  return normalized;
}

function normalizeQuietHour(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const trimmed = value.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) throw new Error("quiet hours must use HH:mm");
  const [hour, minute] = trimmed.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error("quiet hours must use HH:mm");
  return trimmed;
}

function isInQuietHours(start: string, end: string, now = new Date()) {
  if (!start || !end || start === end) return false;
  const current = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function toNotificationRuleSummary(record: NotificationRuleRecord): NotificationRuleSummary {
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    target: record.target,
    targetId: record.targetId,
    eventTypes: parseJsonStringArray(record.eventTypesJson),
    mailboxIds: parseJsonStringArray(record.mailboxIdsJson),
    keyword: record.keyword,
    quietHoursStart: record.quietHoursStart,
    quietHoursEnd: record.quietHoursEnd,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function parseNotificationRulePayload(payload: unknown): NotificationRuleInput {
  if (!payload || typeof payload !== "object") throw new Error("Invalid notification rule payload");
  const input = payload as Partial<NotificationRuleInput>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new Error("Rule name is required");
  if (name.length > 120) throw new Error("Rule name is too long");
  if (!input.target || !notificationTargets.has(input.target)) throw new Error("Unsupported notification target");
  const eventTypes = normalizeStringList(input.eventTypes, { allowed: notificationEvents, maxItems: 20 });
  if (eventTypes.length === 0) throw new Error("At least one event type is required");

  return {
    name,
    enabled: input.enabled ?? true,
    target: input.target,
    targetId: typeof input.targetId === "string" && input.targetId.trim() ? input.targetId.trim() : null,
    eventTypes,
    mailboxIds: normalizeStringList(input.mailboxIds, { maxItems: 100 }),
    keyword: typeof input.keyword === "string" ? input.keyword.trim().slice(0, 120) : "",
    quietHoursStart: normalizeQuietHour(input.quietHoursStart),
    quietHoursEnd: normalizeQuietHour(input.quietHoursEnd)
  };
}

export function toNotificationRuleRecordInput(userId: string, input: NotificationRuleInput) {
  return {
    userId,
    name: input.name,
    enabled: input.enabled,
    target: input.target,
    targetId: input.targetId ?? null,
    eventTypesJson: JSON.stringify(input.eventTypes),
    mailboxIdsJson: JSON.stringify(input.mailboxIds ?? []),
    keyword: input.keyword ?? "",
    quietHoursStart: input.quietHoursStart ?? "",
    quietHoursEnd: input.quietHoursEnd ?? ""
  };
}

function getRuleMailboxId(data: Record<string, unknown>) {
  const value = data.mailboxId ?? data.accountId;
  return typeof value === "string" ? value : "";
}

function matchesRuleKeyword(rule: NotificationRuleRecord, data: Record<string, unknown>) {
  const keyword = rule.keyword.trim().toLowerCase();
  if (!keyword) return true;
  return JSON.stringify(data).toLowerCase().includes(keyword);
}

function matchesRuleTarget(rule: NotificationRuleRecord, input: { target: NotificationRuleTarget; targetId?: string | null }) {
  if (rule.target !== input.target) return false;
  if (rule.targetId && rule.targetId !== input.targetId) return false;
  return true;
}

function matchesRuleMailbox(rule: NotificationRuleRecord, data: Record<string, unknown>) {
  const mailboxIds = parseJsonStringArray(rule.mailboxIdsJson);
  if (mailboxIds.length === 0) return true;
  return mailboxIds.includes(getRuleMailboxId(data));
}

function matchesRuleEvent(rule: NotificationRuleRecord, eventType: string) {
  return parseJsonStringArray(rule.eventTypesJson).includes(eventType);
}

export async function shouldSendNotificationToTarget(
  store: AppStore,
  userId: string,
  input: {
    data: Record<string, unknown>;
    eventType: string;
    target: NotificationRuleTarget;
    targetId?: string | null;
  }
) {
  const rules = (await store.notificationRules.listByUser(userId)).filter((rule) => rule.enabled && rule.target === input.target);
  if (rules.length === 0) return true;

  return rules.some(
    (rule) =>
      matchesRuleTarget(rule, input) &&
      matchesRuleEvent(rule, input.eventType) &&
      matchesRuleMailbox(rule, input.data) &&
      matchesRuleKeyword(rule, input.data) &&
      !isInQuietHours(rule.quietHoursStart, rule.quietHoursEnd)
  );
}
