import type {
  ApiKeySummary,
  ApiKeyScope,
  DataReliabilitySummary,
  DictionaryCatalogGroup,
  FeatureToggles,
  MailSettings,
  MailSettingsUpdateInput,
  MailDomainSettings,
  MailDomainSummary,
  ProductMaturitySummary,
  RuntimeSettings,
  RuntimeSettingsUpdateInput,
  SystemDiagnosticsSummary,
  TelegramDeliverySummary,
  TelegramLinkCodeSummary,
  TelegramOverviewSummary,
  TelegramSubscriptionSummary,
  TelegramTestMessageResult,
  UserSessionSummary,
  UserProfileSummary,
  UserProfileUpdateInput
} from "@wemail/shared";

import { apiFetch, invalidateApiCache } from "../../shared/api/client";

const SETTINGS_CACHE_TTL_MS = 30_000;

export type TelegramBotMenuResult = {
  ok: boolean;
  reason: string | null;
  commands: Array<{ command: string; description: string }>;
};

export type TelegramWebhookConfigureResult = {
  ok: boolean;
  reason: string | null;
  url: string;
  allowedUpdates: string[];
};

export type WebhookEndpointSummary = {
  id: string;
  name: string;
  url: string;
  events: string[];
  signingSecret?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export function fetchApiKeys() {
  return apiFetch<{ keys: ApiKeySummary[] }>("/api/api-keys");
}

export function fetchDictionaries(options?: { groupKeys?: string[]; includeDisabled?: boolean }) {
  const params = new URLSearchParams();
  if (options?.groupKeys?.length) params.set("groups", options.groupKeys.join(","));
  if (options?.includeDisabled) params.set("includeDisabled", "true");
  const queryString = params.toString();
  return apiFetch<{ dictionaries?: DictionaryCatalogGroup[] }>(`/api/dictionaries${queryString ? `?${queryString}` : ""}`, {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function createApiKey(label: string, scopes: ApiKeyScope[]) {
  invalidateApiCache("/api/api-keys");
  return apiFetch<{ key: { secret: string; prefix: string; scopes: ApiKeyScope[] } }>("/api/api-keys", {
    method: "POST",
    body: JSON.stringify({ label, scopes })
  });
}

export function revokeApiKey(keyId: string) {
  invalidateApiCache("/api/api-keys");
  return apiFetch(`/api/api-keys/${keyId}`, { method: "DELETE" });
}

export function fetchTelegramSubscription() {
  return apiFetch<{ subscription: TelegramSubscriptionSummary | null }>("/api/telegram/subscription");
}

export function fetchTelegramOverview() {
  return apiFetch<{ overview: TelegramOverviewSummary }>("/api/telegram/overview", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function fetchTelegramDeliveries() {
  return apiFetch<{ deliveries: TelegramDeliverySummary[] }>("/api/telegram/deliveries");
}

export function createTelegramLinkCode() {
  return apiFetch<{ link: TelegramLinkCodeSummary }>("/api/telegram/link-code", {
    method: "POST"
  });
}

export function configureTelegramBotMenu() {
  return apiFetch<{ result: TelegramBotMenuResult }>("/api/telegram/bot-menu", {
    method: "POST"
  });
}

export function configureTelegramWebhook() {
  return apiFetch<{ result: TelegramWebhookConfigureResult }>("/api/telegram/webhook/configure", {
    method: "POST"
  });
}

export function fetchWebhookEndpoints() {
  return apiFetch<{ endpoints: WebhookEndpointSummary[] }>("/api/webhook/endpoints");
}

export function saveTelegramSubscription(payload: { chatId: string; enabled: boolean }) {
  invalidateApiCache("/api/telegram/overview");
  return apiFetch("/api/telegram/subscription", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function sendTelegramTestMessage() {
  invalidateApiCache("/api/telegram/overview");
  return apiFetch<{ result: TelegramTestMessageResult }>("/api/telegram/test-message", {
    method: "POST"
  });
}

export function fetchSystemDomains() {
  return apiFetch<MailDomainSettings>("/api/system/domains", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function updateSystemDomains(domains: MailDomainSummary[]) {
  invalidateApiCache("/api/system/domains");
  return apiFetch<MailDomainSettings>("/api/system/domains", {
    method: "PATCH",
    body: JSON.stringify({ domains })
  });
}

export function fetchRuntimeSettings() {
  return apiFetch<{ settings: RuntimeSettings }>("/api/system/runtime-settings", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function fetchSystemFeatures() {
  return apiFetch<{ featureToggles: FeatureToggles }>("/api/system/features", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function fetchSystemDiagnostics() {
  return apiFetch<{ diagnostics: SystemDiagnosticsSummary }>("/api/system/diagnostics", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function fetchSystemMaturity() {
  return apiFetch<{ maturity: ProductMaturitySummary }>("/api/system/maturity", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function fetchSystemReliability() {
  return apiFetch<{ reliability: DataReliabilitySummary }>("/api/system/reliability", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function updateRuntimeSettings(payload: RuntimeSettingsUpdateInput) {
  invalidateApiCache("/api/system/runtime-settings");
  return apiFetch<{ settings: RuntimeSettings }>("/api/system/runtime-settings", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchUserProfile() {
  return apiFetch<{ profile: UserProfileSummary }>("/api/profile");
}

export function fetchProfileSessions() {
  return apiFetch<{ sessions: UserSessionSummary[] }>("/api/profile/sessions");
}

export function revokeProfileSession(sessionId: string) {
  return apiFetch<{ ok: boolean }>(`/api/profile/sessions/${sessionId}`, { method: "DELETE" });
}

export function revokeOtherProfileSessions() {
  return apiFetch<{ ok: boolean }>("/api/profile/sessions/others", { method: "DELETE" });
}

export function updateUserProfile(payload: UserProfileUpdateInput) {
  return apiFetch<{ profile: UserProfileSummary }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchMailSettings() {
  return apiFetch<{ settings: MailSettings }>("/api/mail/settings", {
    cacheTtlMs: SETTINGS_CACHE_TTL_MS
  });
}

export function updateMailSettings(payload: MailSettingsUpdateInput) {
  invalidateApiCache("/api/mail/settings");
  return apiFetch<{ settings: MailSettings }>("/api/mail/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
