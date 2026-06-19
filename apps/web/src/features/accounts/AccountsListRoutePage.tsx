import { useCallback, useEffect, useMemo, useState } from "react";
import type { MailDomainSummary, MailboxDetail, MailboxStatus } from "@wemail/shared";

import {
  bulkDeleteAccounts,
  createAccount,
  deleteAccount,
  fetchAccountDomains,
  fetchAccountPolicy,
  fetchAccountsList,
  updateAccount,
  type AccountCreatePayload,
  type AccountsListQuery
} from "./api";
import { AccountsListPage } from "./AccountsListPage";

type AccountsStatusFilter = "all" | "enabled" | "disabled" | "archived" | "soft_deleted";
type AccountsQuickFilter = "none" | "anomaly" | "inactive";
type AccountsActiveRange = "all" | "7d" | "30d" | "90d";

const ACCOUNTS_EXPORT_PAGE_SIZE = 500;

export function AccountsListRoutePage() {
  const [accounts, setAccounts] = useState<MailboxDetail[]>([]);
  const [availableDomains, setAvailableDomains] = useState<MailDomainSummary[]>([]);
  const [requireCreatorNote, setRequireCreatorNote] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountsStatusFilter>("all");
  const [activeRange, setActiveRange] = useState<AccountsActiveRange>("all");
  const [quickFilter, setQuickFilter] = useState<AccountsQuickFilter>("none");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const query = useMemo<AccountsListQuery>(
    () => ({
      page,
      pageSize,
      search: searchValue,
      status: statusFilter === "all" ? undefined : statusFilter,
      activeRange: activeRange === "all" ? undefined : activeRange,
      quickFilter: quickFilter === "none" ? undefined : quickFilter
    }),
    [activeRange, page, pageSize, quickFilter, searchValue, statusFilter]
  );

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAccountsList(query);
      setAccounts(data.accounts);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const loadAccountDomains = useCallback(async () => {
    setIsLoadingDomains(true);
    try {
      const data = await fetchAccountDomains();
      setAvailableDomains(Array.isArray(data.domains) ? data.domains : []);
    } catch {
      setAvailableDomains([]);
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  const loadAccountPolicy = useCallback(async () => {
    try {
      const data = await fetchAccountPolicy();
      setRequireCreatorNote(Boolean(data.policy.creation.requireCreatorNote));
    } catch {
      setRequireCreatorNote(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadAccountDomains();
  }, [loadAccountDomains]);

  useEffect(() => {
    void loadAccountPolicy();
  }, [loadAccountPolicy]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (page > pageCount) setPage(pageCount);
  }, [page, pageSize, total]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: AccountsStatusFilter) => {
    setStatusFilter(value);
    setQuickFilter("none");
    setPage(1);
  }, []);

  const handleActiveRangeChange = useCallback((value: AccountsActiveRange) => {
    setActiveRange(value);
    if (value !== "all") setQuickFilter("none");
    setPage(1);
  }, []);

  const handleQuickFilterChange = useCallback((value: AccountsQuickFilter) => {
    setQuickFilter(value);
    if (value !== "none") {
      setActiveRange("all");
      setStatusFilter("all");
    }
    setPage(1);
  }, []);

  const handleCreateAccount = useCallback(
    async (payload: AccountCreatePayload) => {
      await createAccount(payload);
      await loadAccounts();
    },
    [loadAccounts]
  );

  const handleRefresh = useCallback(() => {
    void loadAccounts();
    void loadAccountDomains();
    void loadAccountPolicy();
  }, [loadAccountDomains, loadAccountPolicy, loadAccounts]);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const handleUpdateAccount = useCallback(
    async (accountId: string, payload: { label?: string; status?: MailboxStatus }) => {
      await updateAccount(accountId, payload);
      await loadAccounts();
    },
    [loadAccounts]
  );

  const handleDeleteAccount = useCallback(
    async (accountId: string) => {
      await deleteAccount(accountId);
      await loadAccounts();
    },
    [loadAccounts]
  );

  const handleBulkDeleteAccounts = useCallback(
    async (accountIds: string[]) => {
      await bulkDeleteAccounts({
        accountIds,
        mode: "hard",
        confirmationPhrase: `DELETE ${accountIds.length} ACCOUNTS`
      });
      await loadAccounts();
    },
    [loadAccounts]
  );

  const handleExportAccounts = useCallback(async () => {
    const accountsForExport = await fetchAccountsForExport(query);
    exportAccountsCsv(accountsForExport);
  }, [query]);

  return (
    <AccountsListPage
      accounts={accounts}
      activeRange={activeRange}
      availableDomains={availableDomains}
      error={error}
      isLoading={isLoading}
      isLoadingDomains={isLoadingDomains}
      requireCreatorNote={requireCreatorNote}
      onActiveRangeChange={handleActiveRangeChange}
      onBulkDeleteAccounts={handleBulkDeleteAccounts}
      onCreateAccount={handleCreateAccount}
      onDeleteAccount={handleDeleteAccount}
      onExportAccounts={() => void handleExportAccounts()}
      onPageChange={setPage}
      onPageSizeChange={handlePageSizeChange}
      onQuickFilterChange={handleQuickFilterChange}
      onRefresh={handleRefresh}
      onSearchChange={handleSearchChange}
      onStatusFilterChange={handleStatusFilterChange}
      onUpdateAccount={handleUpdateAccount}
      page={page}
      pageSize={pageSize}
      quickFilter={quickFilter}
      searchValue={searchValue}
      statusFilter={statusFilter}
      total={total}
    />
  );
}

async function fetchAccountsForExport(query: AccountsListQuery) {
  const firstPage = await fetchAccountsList({
    ...query,
    page: 1,
    pageSize: ACCOUNTS_EXPORT_PAGE_SIZE
  });
  const accounts = [...firstPage.accounts];
  const pageCount = Math.ceil(firstPage.total / ACCOUNTS_EXPORT_PAGE_SIZE);

  for (let pageIndex = 2; pageIndex <= pageCount; pageIndex += 1) {
    const page = await fetchAccountsList({
      ...query,
      page: pageIndex,
      pageSize: ACCOUNTS_EXPORT_PAGE_SIZE
    });
    accounts.push(...page.accounts);
  }

  return accounts;
}

function formatAccountStatus(status: MailboxStatus) {
  const labels: Record<MailboxStatus, string> = {
    enabled: "启用",
    disabled: "停用",
    archived: "已归档",
    soft_deleted: "已软删除"
  };

  return labels[status];
}

function exportAccountsCsv(accounts: MailboxDetail[]) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const headers = ["地址", "账号标签", "状态", "创建人", "最近活跃", "邮件数量", "发件数量", "创建时间"];
  const rows = accounts.map((account) => [
    account.address,
    account.label,
    formatAccountStatus(account.status),
    account.createdByName ?? "-",
    account.lastActiveAt ? account.lastActiveAt.slice(0, 10) : "-",
    String(account.messageCount),
    String(account.outboundCount),
    account.createdAt.slice(0, 10)
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${value.replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wemail-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}
