import type { AdminGovernanceSummary, CommercialModelSummary, FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import {
  fetchAdminCommercial,
  fetchAdminFeatures,
  fetchAdminGovernance,
  fetchAdminInvites,
  fetchAdminMailboxes,
  fetchAdminQuota,
  fetchAdminUserSummary,
  fetchAdminUsers
} from "./api";
import { selectInitialQuotaUserId } from "./selectors";
import type { AdminSettingsListQuery, AdminUsersQuery, InviteSummary } from "./types";

export const ADMIN_SETTINGS_PAGE_SIZE = 5;

const DEFAULT_ADMIN_SETTINGS_QUERY: AdminSettingsListQuery = {
  page: 1,
  pageSize: ADMIN_SETTINGS_PAGE_SIZE
};

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
  const [usersPayload, summaryPayload, invitesPayload, featuresPayload, mailboxesPayload, governancePayload, commercialPayload] = await Promise.all([
    fetchAdminUsers(query),
    fetchAdminUserSummary(),
    fetchAdminInvites(DEFAULT_ADMIN_SETTINGS_QUERY),
    fetchAdminFeatures(),
    fetchAdminMailboxes(DEFAULT_ADMIN_SETTINGS_QUERY),
    fetchAdminGovernance(),
    fetchAdminCommercial()
  ]);

  const settingsUsers = summaryPayload.quotaUsers ?? usersPayload.users;
  const userStats = summaryPayload.stats ?? {
    active: settingsUsers.filter((user) => user.status === "active").length,
    total: usersPayload.total ?? settingsUsers.length
  };
  const invites = invitesPayload.invites ?? [];
  const mailboxes = mailboxesPayload.mailboxes ?? [];
  const initialQuotaUserId = selectInitialQuotaUserId(settingsUsers);
  const quotaPayload = initialQuotaUserId ? await fetchAdminQuota(initialQuotaUserId) : null;

  return {
    users: usersPayload.users as UserSummary[],
    usersTotal: usersPayload.total ?? usersPayload.users.length,
    usersPage: usersPayload.page ?? query?.page ?? 1,
    usersPageSize: usersPayload.pageSize ?? query?.pageSize ?? usersPayload.users.length,
    settingsUsers: settingsUsers as UserSummary[],
    userStats,
    invites: invites as InviteSummary[],
    invitesAvailable: invitesPayload.available ?? invites.length,
    invitesPage: invitesPayload.page ?? DEFAULT_ADMIN_SETTINGS_QUERY.page,
    invitesPageSize: invitesPayload.pageSize ?? DEFAULT_ADMIN_SETTINGS_QUERY.pageSize,
    invitesTotal: invitesPayload.total ?? invites.length,
    features: featuresPayload.featureToggles as FeatureToggles,
    mailboxes: mailboxes as MailboxSummary[],
    latestMailbox: (mailboxesPayload.latestMailbox ?? null) as MailboxSummary | null,
    mailboxesPage: mailboxesPayload.page ?? DEFAULT_ADMIN_SETTINGS_QUERY.page,
    mailboxesPageSize: mailboxesPayload.pageSize ?? DEFAULT_ADMIN_SETTINGS_QUERY.pageSize,
    mailboxesTotal: mailboxesPayload.total ?? mailboxes.length,
    quota: (quotaPayload?.quota ?? null) as QuotaSummary | null,
    governance: (governancePayload.governance ?? null) as AdminGovernanceSummary | null,
    commercial: (commercialPayload.commercial ?? null) as CommercialModelSummary | null
  };
}

export async function queryAdminGovernance() {
  const payload = await fetchAdminGovernance();
  return (payload.governance ?? null) as AdminGovernanceSummary | null;
}

export async function queryAdminCommercial() {
  const payload = await fetchAdminCommercial();
  return (payload.commercial ?? null) as CommercialModelSummary | null;
}

export async function queryAdminUserSettingsSummary() {
  const payload = await fetchAdminUserSummary();
  return {
    settingsUsers: (payload.quotaUsers ?? []) as UserSummary[],
    userStats: payload.stats ?? { active: 0, total: 0 }
  };
}

export async function queryAdminInvites(query: AdminSettingsListQuery = DEFAULT_ADMIN_SETTINGS_QUERY) {
  const payload = await fetchAdminInvites(query);
  const invites = payload.invites ?? [];
  return {
    invites: invites as InviteSummary[],
    invitesAvailable: payload.available ?? invites.length,
    invitesPage: payload.page ?? query.page,
    invitesPageSize: payload.pageSize ?? query.pageSize,
    invitesTotal: payload.total ?? invites.length
  };
}

export async function queryAdminMailboxes(query: AdminSettingsListQuery = DEFAULT_ADMIN_SETTINGS_QUERY) {
  const payload = await fetchAdminMailboxes(query);
  const mailboxes = payload.mailboxes ?? [];
  return {
    latestMailbox: (payload.latestMailbox ?? null) as MailboxSummary | null,
    mailboxes: mailboxes as MailboxSummary[],
    mailboxesPage: payload.page ?? query.page,
    mailboxesPageSize: payload.pageSize ?? query.pageSize,
    mailboxesTotal: payload.total ?? mailboxes.length
  };
}

export async function queryQuota(userId: string) {
  const payload = await fetchAdminQuota(userId);
  return payload.quota as QuotaSummary;
}
