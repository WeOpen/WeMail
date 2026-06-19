import type {
  AccountBulkDeleteInput,
  AccountCreationStatus,
  AccountPolicy,
  AccountPolicyUpdateInput,
  MailDomainSettings,
  MailboxDetail,
  MailboxStatus
} from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";

export type AccountsListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  activeRange?: "7d" | "30d" | "90d";
  createdBy?: string;
  quickFilter?: "anomaly" | "inactive";
};

export type AccountsListPayload = {
  accounts: MailboxDetail[];
  total: number;
};

export type AccountCreatePayload = {
  label: string;
  domain: string;
  creatorNote?: string;
  status?: AccountCreationStatus;
  tags?: string[];
};

function buildAccountsListPath(query: AccountsListQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize)
  });

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.status && query.status !== "all") {
    params.set("status", query.status);
  }

  if (query.activeRange) {
    params.set("activeRange", query.activeRange);
  }

  if (query.createdBy && query.createdBy !== "all") {
    params.set("createdBy", query.createdBy);
  }

  if (query.quickFilter) {
    params.set("quickFilter", query.quickFilter);
  }

  return `/api/accounts/list?${params.toString()}`;
}

export function fetchAccountsList(query: AccountsListQuery) {
  return apiFetch<AccountsListPayload>(buildAccountsListPath(query));
}

export function fetchAccountDomains() {
  return apiFetch<MailDomainSettings>("/api/accounts/domains");
}

export function fetchAccountPolicy() {
  return apiFetch<{ policy: AccountPolicy }>("/api/accounts/settings");
}

export function updateAccountPolicy(payload: AccountPolicyUpdateInput) {
  return apiFetch<{ policy: AccountPolicy }>("/api/accounts/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function createAccount(payload: AccountCreatePayload) {
  return apiFetch<{ mailbox: MailboxDetail }>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateAccount(accountId: string, payload: { label?: string; status?: MailboxStatus }) {
  return apiFetch<{ account: MailboxDetail }>(`/api/accounts/${accountId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteAccount(accountId: string) {
  return apiFetch<{ ok: boolean }>(`/api/accounts/${accountId}`, {
    method: "DELETE"
  });
}

export function bulkDeleteAccounts(payload: AccountBulkDeleteInput) {
  return apiFetch<{ ok: boolean; deleted: number }>("/api/accounts/bulk-delete", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
