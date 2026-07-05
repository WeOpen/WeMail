import type { AdminGovernanceSummary, CommercialModelSummary, FeatureToggles, QuotaSummary, UserRole, UserStatus, UserSummary } from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";
import type {
  AdminInvitesPayload,
  AdminMailboxesPayload,
  AdminSettingsListQuery,
  AdminUserSettingsSummaryPayload,
  AdminUsersPayload,
  AdminUsersQuery,
  InviteCreatePayload
} from "./types";

function buildAdminUsersPath(query?: AdminUsersQuery) {
  if (!query) return "/api/users";

  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize)
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.role !== "all") params.set("role", query.role);
  if (query.status !== "all") params.set("status", query.status);

  return `/api/users?${params.toString()}`;
}

function buildAdminSettingsListPath(path: string, query: AdminSettingsListQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize)
  });

  return `${path}?${params.toString()}`;
}

export function fetchAdminUsers(query?: AdminUsersQuery) {
  return apiFetch<AdminUsersPayload>(buildAdminUsersPath(query));
}

export function fetchAdminUserSummary(query: AdminSettingsListQuery) {
  return apiFetch<AdminUserSettingsSummaryPayload>(buildAdminSettingsListPath("/api/users/summary", query));
}

export function fetchAdminGovernance() {
  return apiFetch<{ governance: AdminGovernanceSummary }>("/api/users/governance");
}

export function fetchAdminCommercial() {
  return apiFetch<{ commercial: CommercialModelSummary }>("/api/users/commercial");
}

export function createAdminUser(payload: { email: string; name: string; password: string; role: UserRole }) {
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

export function updateAdminUser(userId: string, payload: { name: string }) {
  return apiFetch<{ user: UserSummary }>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function resetAdminUserPassword(userId: string, password: string) {
  return apiFetch<{ user: UserSummary }>(`/api/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password })
  });
}

export function updateAdminUserStatus(userId: string, status: UserStatus) {
  return apiFetch<{ user: UserSummary }>(`/api/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function deleteAdminUser(userId: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/${userId}`, { method: "DELETE" });
}

export function fetchAdminInvites(query: AdminSettingsListQuery) {
  return apiFetch<AdminInvitesPayload>(buildAdminSettingsListPath("/api/users/invites", query));
}

export function fetchAdminFeatures() {
  return apiFetch<{ featureToggles: FeatureToggles }>("/api/system/features");
}

export function fetchAdminMailboxes(query: AdminSettingsListQuery) {
  return apiFetch<AdminMailboxesPayload>(buildAdminSettingsListPath("/api/users/accounts", query));
}

export function fetchAdminQuota(userId: string) {
  return apiFetch<{ quota: QuotaSummary }>(`/api/users/${userId}/quota`);
}

export function createInvite(payload: InviteCreatePayload) {
  return apiFetch("/api/users/invites", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function disableInvite(inviteId: string) {
  return apiFetch(`/api/users/invites/${inviteId}`, { method: "DELETE" });
}

export function updateQuota(userId: string, payload: { apiDailyLimit: number; dailyLimit: number; disabled: boolean }) {
  return apiFetch<{ quota: QuotaSummary }>(`/api/users/${userId}/quota`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function updateAdminFeatures(nextFeatureToggles: FeatureToggles) {
  return apiFetch<{ featureToggles: FeatureToggles }>("/api/system/features", {
    method: "PATCH",
    body: JSON.stringify(nextFeatureToggles)
  });
}
