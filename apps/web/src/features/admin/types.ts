import type { UserRole, UserStatus, UserSummary } from "@wemail/shared";

export type InviteStatus = "ready" | "redeemed" | "disabled";

export type InviteSummary = {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  disabledAt: string | null;
  status?: InviteStatus;
};

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
