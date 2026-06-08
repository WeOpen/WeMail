import type { ApiKeySummary, MailDomainSettings, MailDomainSummary, TelegramSubscriptionSummary } from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";

export function fetchApiKeys() {
  return apiFetch<{ keys: ApiKeySummary[] }>("/api/api-keys");
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

export function saveTelegramSubscription(payload: { chatId: string; enabled: boolean }) {
  return apiFetch("/api/telegram/subscription", {
    method: "PUT",
    body: JSON.stringify(payload)
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
