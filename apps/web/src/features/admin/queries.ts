import type { FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import {
  fetchAdminFeatures,
  fetchAdminInvites,
  fetchAdminMailboxes,
  fetchAdminQuota,
  fetchAdminUsers
} from "./api";
import { selectInitialQuotaUserId } from "./selectors";
import type { AdminUsersQuery, InviteSummary } from "./types";

export async function queryAdminUsers(query: AdminUsersQuery) {
  const payload = await fetchAdminUsers(query);
  return {
    users: payload.users as UserSummary[],
    total: payload.total ?? payload.users.length,
    page: payload.page ?? query.page,
    pageSize: payload.pageSize ?? query.pageSize
  };
}

export async function queryAdminDashboard(query?: AdminUsersQuery) {
  const [usersPayload, invitesPayload, featuresPayload, mailboxesPayload] = await Promise.all([
    fetchAdminUsers(query),
    fetchAdminInvites(),
    fetchAdminFeatures(),
    fetchAdminMailboxes()
  ]);

  const initialQuotaUserId = selectInitialQuotaUserId(usersPayload.users);
  const quotaPayload = initialQuotaUserId ? await fetchAdminQuota(initialQuotaUserId) : null;

  return {
    users: usersPayload.users as UserSummary[],
    usersTotal: usersPayload.total ?? usersPayload.users.length,
    usersPage: usersPayload.page ?? query?.page ?? 1,
    usersPageSize: usersPayload.pageSize ?? query?.pageSize ?? usersPayload.users.length,
    invites: invitesPayload.invites as InviteSummary[],
    features: featuresPayload.featureToggles as FeatureToggles,
    mailboxes: mailboxesPayload.mailboxes as MailboxSummary[],
    quota: (quotaPayload?.quota ?? null) as QuotaSummary | null
  };
}

export async function queryQuota(userId: string) {
  const payload = await fetchAdminQuota(userId);
  return payload.quota as QuotaSummary;
}
