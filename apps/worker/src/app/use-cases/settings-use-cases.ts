import type { FeatureToggles, MailDomainSettings, TelegramOverviewSummary } from "@wemail/shared";

import type { AppBindings, AppStore, TelegramSubscriptionRecord } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { createApiKeySecret, hashString } from "../../shared/auth";
import { defaultMailDomains, getMailDomains, normalizeMailDomainEntries } from "../services/config-service";
import { jsonError, recordAudit } from "../services/audit-service";
import { CACHE_KEYS, deleteCacheKeys } from "../services/cache-service";
import {
  createTelegramLinkCode,
  getTelegramSupportedEvents,
  handleTelegramWebhookUpdate,
  listTelegramDeliveries,
  sendTelegramNotification,
  validateTelegramChat
} from "../services/telegram-service";

type SettingsUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "telegramEnabled">;
  env: AppBindings;
};

function toMailDomainSettings(domains: MailDomainSettings["domains"]): MailDomainSettings {
  return {
    domains,
    primaryDomain: domains[0]?.domain ?? ""
  };
}

function toTelegramSubscriptionDetail(subscription: TelegramSubscriptionRecord | null) {
  if (!subscription) return null;
  return {
    chatId: subscription.chatId,
    enabled: subscription.enabled,
    updatedAt: subscription.updatedAt
  };
}

export async function getTelegramSubscription(context: SettingsUseCaseContext, userId: string) {
  return context.store.telegram.findByUserId(userId);
}

export async function getTelegramOverviewUseCase(
  context: SettingsUseCaseContext,
  userId: string
): Promise<TelegramOverviewSummary> {
  const subscription = await context.store.telegram.findByUserId(userId);
  const botConfigured = Boolean(resolveAppConfig(context.env).integrations.telegramBotToken);
  const hasActiveSubscription = Boolean(subscription?.enabled);
  return {
    featureEnabled: context.featureToggles.telegramEnabled,
    botConfigured,
    canSendTest: Boolean(context.featureToggles.telegramEnabled && botConfigured && hasActiveSubscription),
    subscription: toTelegramSubscriptionDetail(subscription),
    supportedEvents: getTelegramSupportedEvents(context.featureToggles.telegramEnabled, hasActiveSubscription)
  };
}

export async function saveTelegramSubscriptionUseCase(
  context: SettingsUseCaseContext,
  payload: { userId: string; chatId: string; enabled: boolean }
) {
  if (!context.featureToggles.telegramEnabled) {
    return jsonError("Telegram disabled", 403);
  }

  if (payload.enabled) {
    const validation = await validateTelegramChat(context, payload.chatId);
    if (!validation.ok) return jsonError(validation.reason ?? "Telegram chat is not reachable", 400);
  }

  const subscription = await context.store.telegram.upsert({
    userId: payload.userId,
    chatId: payload.chatId,
    enabled: payload.enabled
  });
  await recordAudit(context.store, "user", payload.userId, "telegram-update", {
    enabled: subscription.enabled
  });
  return subscription;
}

export async function sendTelegramTestMessageUseCase(context: SettingsUseCaseContext, userId: string) {
  if (!context.featureToggles.telegramEnabled) {
    return jsonError("Telegram disabled", 403);
  }

  const subscription = await context.store.telegram.findByUserId(userId);
  if (!subscription) {
    return jsonError("Telegram subscription required", 409);
  }

  if (!subscription.enabled) {
    return jsonError("Telegram subscription paused", 409);
  }

  if (!resolveAppConfig(context.env).integrations.telegramBotToken) {
    return jsonError("Telegram bot token is not configured", 503);
  }

  const result = await sendTelegramNotification(context, {
    userId,
    eventId: "telegram.test",
    text: `WeMail Telegram test notification\nSent at ${new Date().toISOString()}`
  });

  await recordAudit(context.store, "user", userId, "telegram-test", {
    ok: result.delivered
  });

  return {
    delivered: result.delivered,
    attemptedAt: result.attemptedAt,
    reason: result.reason
  };
}

export async function listTelegramDeliveriesUseCase(context: SettingsUseCaseContext, userId: string) {
  return listTelegramDeliveries(context, userId);
}

export async function createTelegramLinkCodeUseCase(context: SettingsUseCaseContext, userId: string) {
  if (!context.featureToggles.telegramEnabled) {
    return jsonError("Telegram disabled", 403);
  }

  return createTelegramLinkCode(context, userId);
}

export async function handleTelegramWebhookUseCase(context: SettingsUseCaseContext, update: unknown) {
  return handleTelegramWebhookUpdate(context, update);
}

export async function listApiKeys(context: SettingsUseCaseContext, userId: string) {
  return context.store.apiKeys.listByUser(userId);
}

export async function createApiKeyUseCase(
  context: SettingsUseCaseContext,
  payload: { userId: string; label: string }
) {
  const secret = await createApiKeySecret();
  const prefix = secret.slice(0, 12);
  const key = await context.store.apiKeys.create({
    userId: payload.userId,
    label: payload.label,
    prefix,
    keyHash: await hashString(secret)
  });
  await recordAudit(context.store, "user", payload.userId, "api-key-create", { prefix });
  await sendTelegramNotification(context, {
    userId: payload.userId,
    eventId: "api_key.created",
    text: `WeMail API key created\nLabel: ${payload.label}\nPrefix: ${prefix}`,
    metadata: { apiKeyId: key.id, prefix }
  });
  return { id: key.id, secret, prefix };
}

export async function revokeApiKeyUseCase(
  context: SettingsUseCaseContext,
  payload: { userId: string; keyId: string }
) {
  const existing = (await context.store.apiKeys.listByUser(payload.userId)).find((key) => key.id === payload.keyId);
  await context.store.apiKeys.revoke(payload.keyId, payload.userId);
  await recordAudit(context.store, "user", payload.userId, "api-key-revoke", { keyId: payload.keyId });
  await sendTelegramNotification(context, {
    userId: payload.userId,
    eventId: "api_key.revoked",
    text: `WeMail API key revoked\nLabel: ${existing?.label ?? "Unknown key"}\nPrefix: ${existing?.prefix ?? payload.keyId}`,
    metadata: { apiKeyId: payload.keyId, prefix: existing?.prefix ?? null }
  });
  return { ok: true };
}

export async function updateFeatureTogglesUseCase(
  context: SettingsUseCaseContext & { currentFeatureToggles: FeatureToggles },
  payload: Partial<FeatureToggles>,
  actorUserId: string
) {
  const current = context.currentFeatureToggles;
  const next = await context.store.settings.saveFeatureToggles({
    aiEnabled: typeof payload.aiEnabled === "boolean" ? payload.aiEnabled : current.aiEnabled,
    telegramEnabled: typeof payload.telegramEnabled === "boolean" ? payload.telegramEnabled : current.telegramEnabled,
    outboundEnabled: typeof payload.outboundEnabled === "boolean" ? payload.outboundEnabled : current.outboundEnabled,
    mailboxCreationEnabled:
      typeof payload.mailboxCreationEnabled === "boolean"
        ? payload.mailboxCreationEnabled
        : current.mailboxCreationEnabled
  });
  await recordAudit(context.store, "user", actorUserId, "features-update", next);
  await deleteCacheKeys(context.env.CACHE, [CACHE_KEYS.featureToggles]);
  return next;
}

export async function getMailDomainSettingsUseCase(
  context: Pick<SettingsUseCaseContext, "store">,
  env: Parameters<typeof defaultMailDomains>[0]
) {
  return toMailDomainSettings(await getMailDomains(context.store, env));
}

export async function updateMailDomainsUseCase(
  context: Pick<SettingsUseCaseContext, "store">,
  payload: { domains?: unknown },
  actorUserId: string
) {
  const domains = Array.isArray(payload.domains) ? normalizeMailDomainEntries(payload.domains) : [];

  if (domains.length === 0) return jsonError("At least one mail domain is required", 400);

  const next = await context.store.mailDomains.saveAll(domains);
  await recordAudit(context.store, "user", actorUserId, "mail-domains-update", { domains: next });
  return toMailDomainSettings(next);
}
