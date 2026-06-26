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
      ok: true;
      chatId: string;
      userId: string;
      command: string;
      delivered: boolean;
      reason: string | null;
    }
  | {
      ok: false;
      reason: string;
    };

const TELEGRAM_LINK_CODE_TTL_MS = 15 * 60 * 1000;
const TELEGRAM_LINK_CODE_EVENT = "telegram-link-code";
const TELEGRAM_LINK_CONSUMED_EVENT = "telegram-link-consumed";

export const telegramBotCommands = [
  { command: "start", description: "绑定 WeMail 账号" },
  { command: "help", description: "查看可用命令" },
  { command: "status", description: "查看账号与邮件状态" },
  { command: "accounts", description: "查看最近邮箱账号" },
  { command: "messages", description: "查看最近邮件" },
  { command: "pause", description: "暂停 Telegram 通知" },
  { command: "resume", description: "恢复 Telegram 通知" },
  { command: "test", description: "发送测试通知" }
];

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

function parseTelegramCommandUpdate(update: unknown) {
  const payload = toRecord(update);
  const message = toRecord(payload.message ?? payload.channel_post);
  const chat = toRecord(message.chat);
  const text = typeof message.text === "string" ? message.text.trim() : "";
  const chatId = toTelegramChatId(chat.id);
  if (!chatId || !text.startsWith("/")) return null;

  const [commandToken] = text.split(/\s+/);
  const command = commandToken?.slice(1).split("@")[0]?.toLowerCase();
  if (!command) return null;

  return { chatId, command };
}

function telegramHelpText() {
  return [
    "WeMail Bot 快捷命令",
    "/status - 查看账号与邮件状态",
    "/accounts - 查看最近邮箱账号",
    "/messages - 查看最近邮件",
    "/pause - 暂停 Telegram 通知",
    "/resume - 恢复 Telegram 通知",
    "/test - 发送测试通知",
    "/help - 查看帮助"
  ].join("\n");
}

async function buildStatusText(context: TelegramContext, userId: string) {
  const [mailboxCount, mailboxes] = await Promise.all([
    context.store.mailboxes.countByUser(userId),
    context.store.mailboxes.listByUser(userId)
  ]);
  const messageResult = await context.store.messages.listForMailboxes({
    mailboxIds: mailboxes.map((mailbox) => mailbox.id),
    page: 1,
    pageSize: 1
  });
  const subscription = await context.store.telegram.findByUserId(userId);

  return [
    "WeMail 状态",
    `邮箱账号：${mailboxCount}`,
    `邮件总数：${messageResult.total}`,
    `Telegram 通知：${subscription?.enabled ? "已开启" : "已暂停"}`
  ].join("\n");
}

async function buildAccountsText(context: TelegramContext, userId: string) {
  const mailboxes = (await context.store.mailboxes.listByUser(userId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  if (mailboxes.length === 0) return "你还没有邮箱账号。";

  return ["最近邮箱账号", ...mailboxes.map((mailbox) => `${mailbox.label || "未命名"}：${mailbox.address}`)].join("\n");
}

async function buildMessagesText(context: TelegramContext, userId: string) {
  const mailboxes = await context.store.mailboxes.listByUser(userId);
  const result = await context.store.messages.listForMailboxes({
    mailboxIds: mailboxes.map((mailbox) => mailbox.id),
    page: 1,
    pageSize: 5
  });

  if (result.messages.length === 0) return "最近没有邮件。";

  return [
    "最近邮件",
    ...result.messages.map((message) => {
      const mailbox = mailboxes.find((entry) => entry.id === message.mailboxId);
      return `${message.subject} - ${message.fromAddress} -> ${mailbox?.address ?? message.toAddress ?? "unknown"}`;
    })
  ].join("\n");
}

async function sendTelegramCommandReply(context: TelegramContext, chatId: string, text: string) {
  const client = buildTelegramClient(resolveAppConfig(context.env).integrations.telegramBotToken);
  if (!client) return { delivered: false, reason: "bot_not_configured" };

  try {
    const result = await client.sendMessage({ chatId, text });
    return { delivered: result.ok, reason: result.ok ? null : "telegram_api_failed" };
  } catch {
    return { delivered: false, reason: "telegram_request_failed" };
  }
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
  if (!startPayload) return handleTelegramCommandUpdate(context, update);

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

async function handleTelegramCommandUpdate(context: TelegramContext, update: unknown): Promise<TelegramWebhookResult> {
  const commandPayload = parseTelegramCommandUpdate(update);
  if (!commandPayload) return { ok: false, reason: "unsupported_update" };

  const subscription = await context.store.telegram.findByChatId(commandPayload.chatId);
  if (!subscription) {
    await sendTelegramCommandReply(
      context,
      commandPayload.chatId,
      "这个 Telegram 会话还没有绑定 WeMail。请先在后台 Telegram 页面生成绑定码，然后发送 /start <绑定码>。"
    );
    return { ok: false, reason: "subscription_missing" };
  }

  let replyText: string;
  if (commandPayload.command === "help" || commandPayload.command === "start") {
    replyText = telegramHelpText();
  } else if (commandPayload.command === "status") {
    replyText = await buildStatusText(context, subscription.userId);
  } else if (commandPayload.command === "accounts") {
    replyText = await buildAccountsText(context, subscription.userId);
  } else if (commandPayload.command === "messages") {
    replyText = await buildMessagesText(context, subscription.userId);
  } else if (commandPayload.command === "pause") {
    await context.store.telegram.upsert({ userId: subscription.userId, chatId: subscription.chatId, enabled: false });
    replyText = "Telegram 通知已暂停。发送 /resume 可以恢复。";
  } else if (commandPayload.command === "resume") {
    await context.store.telegram.upsert({ userId: subscription.userId, chatId: subscription.chatId, enabled: true });
    replyText = "Telegram 通知已恢复。";
  } else if (commandPayload.command === "test") {
    replyText = "WeMail Telegram 测试通知。";
  } else {
    replyText = `不支持的命令：/${commandPayload.command}\n\n${telegramHelpText()}`;
  }

  const delivery = await sendTelegramCommandReply(context, commandPayload.chatId, replyText);
  await recordAudit(context.store, "user", subscription.userId, "telegram-command", {
    chatId: commandPayload.chatId,
    command: commandPayload.command,
    delivered: delivery.delivered,
    reason: delivery.reason
  });

  return {
    ok: true,
    chatId: commandPayload.chatId,
    userId: subscription.userId,
    command: commandPayload.command,
    delivered: delivery.delivered,
    reason: delivery.reason
  };
}

export async function configureTelegramBotMenu(context: TelegramContext) {
  const client = buildTelegramClient(resolveAppConfig(context.env).integrations.telegramBotToken);
  if (!client) return { ok: false, reason: "bot_not_configured", commands: telegramBotCommands };

  const commandsResult = await client.setMyCommands({ commands: telegramBotCommands });
  if (!commandsResult.ok) {
    return { ok: false, reason: commandsResult.description ?? "telegram_api_failed", commands: telegramBotCommands };
  }

  const menuResult = await client.setChatMenuButton();
  if (!menuResult.ok) {
    return { ok: false, reason: menuResult.description ?? "telegram_menu_button_failed", commands: telegramBotCommands };
  }

  return { ok: true, reason: null, commands: telegramBotCommands };
}

const telegramWebhookAllowedUpdates = ["message", "channel_post"];

export async function configureTelegramWebhook(context: TelegramContext, url: string) {
  const config = resolveAppConfig(context.env);
  const client = buildTelegramClient(config.integrations.telegramBotToken);
  if (!client) return { ok: false, reason: "bot_not_configured", url, allowedUpdates: telegramWebhookAllowedUpdates };

  if (config.features.telegramEnabled && config.environment !== "local" && !config.integrations.telegramWebhookSecret) {
    return { ok: false, reason: "webhook_secret_not_configured", url, allowedUpdates: telegramWebhookAllowedUpdates };
  }

  const result = await client.setWebhook({
    url,
    allowedUpdates: telegramWebhookAllowedUpdates,
    dropPendingUpdates: true,
    secretToken: config.integrations.telegramWebhookSecret
  });

  return {
    ok: result.ok,
    reason: result.ok ? null : result.description ?? "telegram_api_failed",
    url,
    allowedUpdates: telegramWebhookAllowedUpdates
  };
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
