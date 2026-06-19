import type {
  FeatureToggles,
  TelegramDeliveryEventId,
  TelegramDeliverySummary,
  TelegramLinkCodeSummary,
  TelegramSupportedEvent,
  TelegramSupportedEventId
} from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { buildTelegramClient } from "../../shared/mail";
import { recordAudit } from "./audit-service";

type TelegramContext = {
  store: AppStore;
  env: AppBindings;
  featureToggles: Pick<FeatureToggles, "telegramEnabled">;
};

type TelegramNotificationPayload = {
  userId: string;
  eventId: TelegramDeliveryEventId;
  text: string;
  metadata?: Record<string, unknown>;
};

type TelegramWebhookResult =
  | {
      ok: true;
      chatId: string;
      userId: string;
    }
  | {
      ok: false;
      reason: string;
    };

const TELEGRAM_LINK_CODE_TTL_MS = 15 * 60 * 1000;
const TELEGRAM_LINK_CODE_EVENT = "telegram-link-code";
const TELEGRAM_LINK_CONSUMED_EVENT = "telegram-link-consumed";

const supportedTelegramEvents: Array<Omit<TelegramSupportedEvent, "enabled">> = [
  {
    id: "message.received",
    label: "新邮件到达",
    description: "账号收到新邮件后发送 Telegram 提醒。"
  },
  {
    id: "message.extraction.detected",
    label: "识别结果",
    description: "邮件中识别到验证码或链接后发送 Telegram 提醒。"
  },
  {
    id: "api_key.created",
    label: "API Key 创建",
    description: "创建新的 API Key 后发送安全提醒。"
  },
  {
    id: "api_key.revoked",
    label: "API Key 吊销",
    description: "吊销 API Key 后发送安全提醒。"
  }
];

const deliveryLabels: Record<TelegramDeliveryEventId, string> = {
  "api_key.created": "API Key 创建",
  "api_key.revoked": "API Key 吊销",
  "message.extraction.detected": "识别结果",
  "message.received": "新邮件到达",
  "telegram.test": "测试通知"
};

function isTelegramDeliveryEventId(value: unknown): value is TelegramDeliveryEventId {
  return typeof value === "string" && value in deliveryLabels;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function parseAuditPayload(payloadJson: string) {
  try {
    return toRecord(JSON.parse(payloadJson));
  } catch {
    return {};
  }
}

function normalizeBotUsername(username: string | undefined) {
  const trimmed = username?.trim().replace(/^@/, "") ?? "";
  return /^[A-Za-z0-9_]{5,32}$/.test(trimmed) ? trimmed : null;
}

function createTelegramLinkCodeValue() {
  return `wm_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function toTelegramChatId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function parseTelegramStartUpdate(update: unknown) {
  const payload = toRecord(update);
  const message = toRecord(payload.message ?? payload.channel_post);
  const chat = toRecord(message.chat);
  const text = typeof message.text === "string" ? message.text.trim() : "";
  const chatId = toTelegramChatId(chat.id);
  if (!chatId || !text) return null;

  const [commandToken, code] = text.split(/\s+/);
  const command = commandToken?.split("@")[0]?.toLowerCase();
  if (command !== "/start" || !code) return null;

  return { chatId, code: code.trim() };
}

export function getTelegramSupportedEvents(
  featureEnabled: boolean,
  hasActiveSubscription: boolean
): TelegramSupportedEvent[] {
  return supportedTelegramEvents.map((event) => ({
    ...event,
    enabled: Boolean(featureEnabled && hasActiveSubscription)
  }));
}

export async function createTelegramLinkCode(
  context: TelegramContext,
  userId: string
): Promise<TelegramLinkCodeSummary> {
  const code = createTelegramLinkCodeValue();
  const expiresAt = new Date(Date.now() + TELEGRAM_LINK_CODE_TTL_MS).toISOString();
  const startCommand = `/start ${code}`;
  const botUsername = normalizeBotUsername(resolveAppConfig(context.env).integrations.telegramBotUsername);

  await recordAudit(context.store, "telegram-link", code, TELEGRAM_LINK_CODE_EVENT, {
    expiresAt,
    userId
  });

  return {
    code,
    deepLinkUrl: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
    expiresAt,
    startCommand
  };
}

export async function validateTelegramChat(context: TelegramContext, chatId: string) {
  const client = buildTelegramClient(resolveAppConfig(context.env).integrations.telegramBotToken);
  if (!client) return { ok: true, reason: null };

  try {
    const result = await client.getChat({ chatId });
    return { ok: result.ok, reason: result.description };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Telegram chat validation failed"
    };
  }
}

export async function sendTelegramNotification(context: TelegramContext, payload: TelegramNotificationPayload) {
  const attemptedAt = new Date().toISOString();

  if (!context.featureToggles.telegramEnabled) {
    return { delivered: false, attemptedAt, reason: "telegram_disabled" };
  }

  const subscription = await context.store.telegram.findByUserId(payload.userId);
  if (!subscription) return { delivered: false, attemptedAt, reason: "subscription_missing" };
  if (!subscription.enabled) return { delivered: false, attemptedAt, reason: "subscription_paused" };

  const client = buildTelegramClient(resolveAppConfig(context.env).integrations.telegramBotToken);
  if (!client) return { delivered: false, attemptedAt, reason: "bot_not_configured" };

  let delivered = false;
  let reason: string | null = null;

  try {
    const result = await client.sendMessage({
      chatId: subscription.chatId,
      text: payload.text
    });
    delivered = result.ok;
    reason = result.ok ? null : "telegram_api_failed";
  } catch {
    reason = "telegram_request_failed";
  }

  await recordAudit(context.store, "user", payload.userId, "telegram-delivery", {
    ...(payload.metadata ?? {}),
    attemptedAt,
    chatId: subscription.chatId,
    delivered,
    eventId: payload.eventId,
    label: deliveryLabels[payload.eventId],
    reason
  });

  return { delivered, attemptedAt, reason };
}

export async function handleTelegramWebhookUpdate(context: TelegramContext, update: unknown): Promise<TelegramWebhookResult> {
  if (!context.featureToggles.telegramEnabled) return { ok: false, reason: "telegram_disabled" };

  const startPayload = parseTelegramStartUpdate(update);
  if (!startPayload) return { ok: false, reason: "unsupported_update" };

  const records = await context.store.audit.listByActorAndTypes(
    startPayload.code,
    [TELEGRAM_LINK_CODE_EVENT, TELEGRAM_LINK_CONSUMED_EVENT],
    10
  );
  const codeRecord = records.find((record) => record.eventType === TELEGRAM_LINK_CODE_EVENT);
  if (!codeRecord) return { ok: false, reason: "link_code_invalid" };
  if (records.some((record) => record.eventType === TELEGRAM_LINK_CONSUMED_EVENT)) {
    return { ok: false, reason: "link_code_consumed" };
  }

  const codePayload = parseAuditPayload(codeRecord.payloadJson);
  const userId = typeof codePayload.userId === "string" ? codePayload.userId : null;
  const expiresAt = typeof codePayload.expiresAt === "string" ? codePayload.expiresAt : null;
  if (!userId || !expiresAt) return { ok: false, reason: "link_code_invalid" };
  if (Date.parse(expiresAt) <= Date.now()) return { ok: false, reason: "link_code_expired" };

  const user = await context.store.users.findById(userId);
  if (!user) return { ok: false, reason: "link_code_owner_missing" };

  const subscription = await context.store.telegram.upsert({
    userId,
    chatId: startPayload.chatId,
    enabled: true
  });

  await recordAudit(context.store, "telegram-link", startPayload.code, TELEGRAM_LINK_CONSUMED_EVENT, {
    chatId: subscription.chatId,
    userId
  });
  await recordAudit(context.store, "user", userId, "telegram-update", {
    bindingMethod: "telegram-start",
    enabled: true
  });

  const client = buildTelegramClient(resolveAppConfig(context.env).integrations.telegramBotToken);
  if (client) {
    try {
      await client.sendMessage({
        chatId: subscription.chatId,
        text: "Telegram 已绑定\nWeMail 已启用此会话的个人通知。"
      });
    } catch {
      // Binding already succeeded; confirmation delivery should not roll it back.
    }
  }

  return { ok: true, chatId: subscription.chatId, userId };
}

export async function listTelegramDeliveries(
  context: Pick<TelegramContext, "store">,
  userId: string,
  limit = 10
): Promise<TelegramDeliverySummary[]> {
  const records = await context.store.audit.listByActorAndTypes(userId, ["telegram-delivery"], limit);
  return records.map((record) => {
    const payload = parseAuditPayload(record.payloadJson);
    const eventId = isTelegramDeliveryEventId(payload.eventId) ? payload.eventId : "message.received";
    return {
      id: record.id,
      eventId,
      label: typeof payload.label === "string" ? payload.label : deliveryLabels[eventId],
      delivered: payload.delivered === true,
      reason: typeof payload.reason === "string" ? payload.reason : null,
      chatId: typeof payload.chatId === "string" ? payload.chatId : null,
      createdAt: record.createdAt
    };
  });
}

export function getTelegramDeliveryLabel(eventId: TelegramSupportedEventId) {
  return deliveryLabels[eventId];
}
