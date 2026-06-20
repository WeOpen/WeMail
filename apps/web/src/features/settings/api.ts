import type {
  ApiKeySummary,
  DictionaryCatalogGroup,
  MailSettings,
  MailSettingsUpdateInput,
  MailDomainSettings,
  MailDomainSummary,
  RuntimeSettings,
  RuntimeSettingsUpdateInput,
  TelegramDeliverySummary,
  TelegramLinkCodeSummary,
  TelegramOverviewSummary,
  TelegramSubscriptionSummary,
  TelegramTestMessageResult,
  UserProfileSummary,
  UserProfileUpdateInput
} from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";

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
  return apiFetch<{ dictionaries?: DictionaryCatalogGroup[] }>(`/api/dictionaries${queryString ? `?${queryString}` : ""}`);
}

export function createApiKey(label: string) {
  return apiFetch<{ key: { secret: string; prefix: string } }>("/api/api-keys", {
    method: "POST",
    body: JSON.stringify({ label })
  });
}

export function revokeApiKey(keyId: string) {
  return apiFetch(`/api/api-keys/${keyId}`, { method: "DELETE" });
}

export function fetchTelegramSubscription() {
  return apiFetch<{ subscription: TelegramSubscriptionSummary | null }>("/api/telegram/subscription");
}

export function fetchTelegramOverview() {
  return apiFetch<{ overview: TelegramOverviewSummary }>("/api/telegram/overview");
}

export function fetchTelegramDeliveries() {
  return apiFetch<{ deliveries: TelegramDeliverySummary[] }>("/api/telegram/deliveries");
}

export function createTelegramLinkCode() {
  return apiFetch<{ link: TelegramLinkCodeSummary }>("/api/telegram/link-code", {
    method: "POST"
  });
}

export function fetchWebhookEndpoints() {
  return apiFetch<{ endpoints: WebhookEndpointSummary[] }>("/api/webhook/endpoints");
}

export function saveTelegramSubscription(payload: { chatId: string; enabled: boolean }) {
  return apiFetch("/api/telegram/subscription", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function sendTelegramTestMessage() {
  return apiFetch<{ result: TelegramTestMessageResult }>("/api/telegram/test-message", {
    method: "POST"
  });
}

export function fetchSystemDomains() {
  return apiFetch<MailDomainSettings>("/api/system/domains");
}

export function updateSystemDomains(domains: MailDomainSummary[]) {
  return apiFetch<MailDomainSettings>("/api/system/domains", {
    method: "PATCH",
    body: JSON.stringify({ domains })
  });
}

export function fetchRuntimeSettings() {
  return apiFetch<{ settings: RuntimeSettings }>("/api/system/runtime-settings");
}

export function updateRuntimeSettings(payload: RuntimeSettingsUpdateInput) {
  return apiFetch<{ settings: RuntimeSettings }>("/api/system/runtime-settings", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchUserProfile() {
  return apiFetch<{ profile: UserProfileSummary }>("/api/profile");
}

export function updateUserProfile(payload: UserProfileUpdateInput) {
  return apiFetch<{ profile: UserProfileSummary }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchMailSettings() {
  return apiFetch<{ settings: MailSettings }>("/api/mail/settings");
}

export function updateMailSettings(payload: MailSettingsUpdateInput) {
  return apiFetch<{ settings: MailSettings }>("/api/mail/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
