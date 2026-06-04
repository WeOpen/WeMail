import type { FeatureToggles, MailboxSummary, QuotaSummary, UserRole, UserSummary } from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";
import type { InviteSummary } from "./types";

export function fetchAdminUsers() {
  return apiFetch<{ users: UserSummary[] }>("/api/users");
}

export function createAdminUser(payload: { email: string; password: string; role: UserRole }) {
  return apiFetch<{ user: UserSummary }>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateAdminUserRole(userId: string, role: UserRole) {
  return apiFetch<{ user: UserSummary }>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role })
  });
}

export function fetchAdminInvites() {
  return apiFetch<{ invites: InviteSummary[] }>("/api/users/invites");
}

export function fetchAdminFeatures() {
  return apiFetch<{ featureToggles: FeatureToggles }>("/api/system/features");
}

export function fetchAdminMailboxes() {
  return apiFetch<{ mailboxes: MailboxSummary[] }>("/api/users/accounts");
}

export function fetchAdminQuota(userId: string) {
  return apiFetch<{ quota: QuotaSummary }>(`/api/users/${userId}/quota`);
}

export function createInvite() {
  return apiFetch("/api/users/invites", { method: "POST" });
}

export function disableInvite(inviteId: string) {
  return apiFetch(`/api/users/invites/${inviteId}`, { method: "DELETE" });
}

export function updateQuota(userId: string, payload: { dailyLimit: number; disabled: boolean }) {
  return apiFetch<{ quota: QuotaSummary }>(`/api/users/${userId}/quota`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function updateAdminFeatures(nextFeatureToggles: FeatureToggles) {
  return apiFetch("/api/system/features", {
    method: "PATCH",
    body: JSON.stringify(nextFeatureToggles)
  });
}
