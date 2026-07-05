import type { InviteCreateInput, MailboxSummary, UserRole, UserStatus, UserSummary } from "@wemail/shared";

export type InviteStatus = "ready" | "redeemed" | "disabled" | "expired";

export type InviteSummary = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  targetRole: UserRole;
  maxRedemptions: number;
  redemptionCount: number;
  redeemedByUserId: string | null;
  redeemedByUserName?: string | null;
  redeemedAt: string | null;
  disabledAt: string | null;
  status?: InviteStatus;
};

export type InviteCreatePayload = Required<InviteCreateInput>;

export type AdminUsersQuery = {
  page: number;
  pageSize: number;
  search: string;
  role: UserRole | "all";
  status: UserStatus | "all";
};

export type AdminUsersPayload = {
  users: UserSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminSettingsListQuery = {
  page: number;
  pageSize: number;
};

export type AdminUserStats = {
  active: number;
  total: number;
};

export type AdminUserSettingsSummaryPayload = {
  quotaUsers: UserSummary[];
  quotaUsersPage: number;
  quotaUsersPageSize: number;
  quotaUsersTotal: number;
  stats: AdminUserStats;
};

export type AdminInvitesPayload = {
  available: number;
  invites: InviteSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminMailboxesPayload = {
  latestMailbox: MailboxSummary | null;
  mailboxes: MailboxSummary[];
  page: number;
  pageSize: number;
  total: number;
};
