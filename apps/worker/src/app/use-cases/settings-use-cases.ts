import type { FeatureToggles, MailDomainSettings } from "@wemail/shared";

import type { AppStore } from "../../core/bindings";
import { createApiKeySecret, hashString } from "../../shared/auth";
import { defaultMailDomains, getMailDomains, normalizeMailDomainEntries } from "../services/config-service";
import { jsonError, recordAudit } from "../services/audit-service";

type SettingsUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "telegramEnabled">;
};

function toMailDomainSettings(domains: MailDomainSettings["domains"]): MailDomainSettings {
  return {
    domains,
    primaryDomain: domains[0]?.domain ?? ""
  };
}

export async function getTelegramSubscription(context: SettingsUseCaseContext, userId: string) {
  return context.store.telegram.findByUserId(userId);
}

export async function saveTelegramSubscriptionUseCase(
  context: SettingsUseCaseContext,
  payload: { userId: string; chatId: string; enabled: boolean }
) {
  if (!context.featureToggles.telegramEnabled) {
    return jsonError("Telegram disabled", 403);
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

export async function listApiKeys(context: SettingsUseCaseContext, userId: string) {
  return context.store.apiKeys.listByUser(userId);
}

export async function createApiKeyUseCase(
  context: SettingsUseCaseContext,
  payload: { userId: string; label: string }
) {
  const secret = await createApiKeySecret();
  const prefix = secret.slice(0, 12);
  await context.store.apiKeys.create({
    userId: payload.userId,
    label: payload.label,
    prefix,
    keyHash: await hashString(secret)
  });
  await recordAudit(context.store, "user", payload.userId, "api-key-create", { prefix });
  return { secret, prefix };
}

export async function revokeApiKeyUseCase(
  context: SettingsUseCaseContext,
  payload: { userId: string; keyId: string }
) {
  await context.store.apiKeys.revoke(payload.keyId, payload.userId);
  await recordAudit(context.store, "user", payload.userId, "api-key-revoke", { keyId: payload.keyId });
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
