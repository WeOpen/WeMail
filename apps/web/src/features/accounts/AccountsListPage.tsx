import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Edit3,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2
} from "lucide-react";
import type { MailDomainSummary, MailboxDetail, MailboxStatus, UserRole } from "@wemail/shared";

import { Badge } from "../../shared/badge";
import { Button } from "../../shared/button";
import { FilterBar, FilterBarActions } from "../../shared/filter-bar";
import { CheckboxField, FormField, SearchInput, SelectInput, TextInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { Pagination } from "../../shared/pagination";
import { Page, PageHeader, PageMain, PageToolbar } from "../../shared/page-layout";
import { Popover, PopoverContent, PopoverTrigger } from "../../shared/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableStateCard
} from "../../shared/table";

type AccountsStatusFilter = "all" | "enabled" | "disabled" | "archived" | "soft_deleted";
type AccountsQuickFilter = "none" | "anomaly" | "inactive";
type AccountsActiveRange = "all" | "7d" | "30d" | "90d";

type AccountsListPageProps = {
  accounts: MailboxDetail[];
  availableDomains: MailDomainSummary[];
  currentUserRole?: UserRole;
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  isLoadingDomains?: boolean;
  requireCreatorNote?: boolean;
  activeRange: AccountsActiveRange;
  error?: string | null;
  searchValue: string;
  statusFilter: AccountsStatusFilter;
  quickFilter: AccountsQuickFilter;
  onActiveRangeChange: (value: AccountsActiveRange) => void;
  onBulkDeleteAccounts: (accountIds: string[]) => Promise<void>;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: AccountsStatusFilter) => void;
  onQuickFilterChange: (value: AccountsQuickFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onCreateAccount: (payload: { label: string; domain: string; creatorNote?: string }) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onExportAccounts: () => void;
  onRefresh: () => void;
  onUpdateAccount: (accountId: string, payload: { label?: string; status?: MailboxStatus }) => Promise<void>;
};

const ACCOUNTS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const statusLabelMap: Record<MailboxStatus, string> = {
  enabled: "启用",
  disabled: "停用",
  archived: "已归档",
  soft_deleted: "已软删除"
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatLastActive(value: string | null) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

function getStatusBadgeVariant(status: MailboxStatus) {
  switch (status) {
    case "enabled":
      return "success";
    case "disabled":
      return "warning";
    case "archived":
      return "neutral";
    case "soft_deleted":
      return "danger";
    default:
      return "neutral";
  }
}

function getNextStatus(status: MailboxStatus): MailboxStatus {
  return status === "disabled" ? "enabled" : "disabled";
}

function getStatusActionLabel(status: MailboxStatus) {
  return getNextStatus(status) === "disabled" ? "停用" : "启用";
}

type AccountActionMenuProps = {
  account: MailboxDetail;
  onEdit: (account: MailboxDetail) => void;
  onDelete: (account: MailboxDetail) => void;
  onToggleStatus: (account: MailboxDetail) => void;
};

function AccountActionMenu({ account, onDelete, onEdit, onToggleStatus }: AccountActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuName = `${account.address} 操作`;
  const statusActionLabel = getStatusActionLabel(account.status);

  function runAction(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger className="ui-button ui-button-secondary ui-button-size-md users-action-trigger">
        <span className="ui-button-icon-slot" aria-hidden="true">
          <MoreHorizontal />
        </span>
        <span className="ui-button-label">操作</span>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={menuName} className="users-action-menu">
        <Button
          className="users-action-menu-item"
          leadingIcon={<Edit3 aria-hidden="true" />}
          onClick={() => runAction(() => onEdit(account))}
          variant="ghost"
        >
          修改
        </Button>
        <Button
          className="users-action-menu-item"
          leadingIcon={getNextStatus(account.status) === "disabled" ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
          onClick={() => runAction(() => onToggleStatus(account))}
          variant="ghost"
        >
          {statusActionLabel}
        </Button>
        <Button
          className="users-action-menu-item users-action-menu-item-danger"
          leadingIcon={<Trash2 aria-hidden="true" />}
          onClick={() => runAction(() => onDelete(account))}
          variant="ghost"
        >
          删除
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function AccountsListPage({
  accounts,
  availableDomains,
  currentUserRole = "admin",
  total,
  page,
  pageSize,
  isLoading,
  isLoadingDomains,
  requireCreatorNote = false,
  activeRange,
  error,
  searchValue,
  statusFilter,
  quickFilter,
  onActiveRangeChange,
  onBulkDeleteAccounts,
  onSearchChange,
  onStatusFilterChange,
  onQuickFilterChange,
  onPageChange,
  onPageSizeChange,
  onCreateAccount,
  onDeleteAccount,
  onExportAccounts,
  onRefresh,
  onUpdateAccount
}: AccountsListPageProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isHardDeleteDialogOpen, setIsHardDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [newAccountDomain, setNewAccountDomain] = useState("");
  const [newAccountNote, setNewAccountNote] = useState("");
  const [editingAccount, setEditingAccount] = useState<MailboxDetail | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [deletingAccount, setDeletingAccount] = useState<MailboxDetail | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isMutatingAccount, setIsMutatingAccount] = useState(false);

  const selectedCount = selectedIds.length;
  const canManageAccounts = currentUserRole === "admin";
  const visibleColumnCount = 6 + (canManageAccounts ? 3 : 0);

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedIds.includes(account.id)),
    [accounts, selectedIds]
  );

  const hardDeletePhrase = `DELETE ${selectedCount} ACCOUNTS`;
  const selectedAccountsWithMailHistory = selectedAccounts.filter(
    (account) => account.messageCount > 0 || account.outboundCount > 0
  ).length;
  const canCreateAccount =
    Boolean(newAccountLabel.trim()) &&
    Boolean(newAccountDomain) &&
    (!requireCreatorNote || Boolean(newAccountNote.trim())) &&
    !isCreating &&
    !isLoadingDomains;
  const domainPlaceholderLabel = isLoadingDomains ? "加载域名中" : availableDomains.length === 0 ? "暂无可用域名" : "请选择域名";

  useEffect(() => {
    setConfirmationPhrase("");

    if (selectedCount === 0) {
      setIsMoreActionsOpen(false);
      setIsHardDeleteDialogOpen(false);
    }
  }, [selectedCount]);

  const allVisibleSelected = accounts.length > 0 && accounts.every((account) => selectedIds.includes(account.id));

  function toggleSelection(accountId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(accountId) ? currentIds.filter((id) => id !== accountId) : [...currentIds, accountId]
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allVisibleSelected ? [] : accounts.map((account) => account.id));
  }

  function closeHardDeleteDialog() {
    setConfirmationPhrase("");
    setIsHardDeleteDialogOpen(false);
  }

  function openHardDeleteDialog() {
    setConfirmationPhrase("");
    setIsHardDeleteDialogOpen(true);
  }

  function closeCreateDialog() {
    setNewAccountLabel("");
    setNewAccountDomain("");
    setNewAccountNote("");
    setIsCreateDialogOpen(false);
  }

  function openCreateDialog() {
    setNewAccountLabel("");
    setNewAccountDomain("");
    setNewAccountNote("");
    setIsCreateDialogOpen(true);
  }

  async function handleCreateAccount() {
    if (!canCreateAccount) return;
    setIsCreating(true);
    try {
      await onCreateAccount({
        label: newAccountLabel.trim(),
        domain: newAccountDomain,
        ...(requireCreatorNote ? { creatorNote: newAccountNote.trim() } : {})
      });
      closeCreateDialog();
    } finally {
      setIsCreating(false);
    }
  }

  function openEditDialog(account: MailboxDetail) {
    setEditingAccount(account);
    setEditingLabel(account.label);
  }

  function closeEditDialog() {
    setEditingAccount(null);
    setEditingLabel("");
  }

  async function handleUpdateAccount() {
    if (!editingAccount || !editingLabel.trim() || isMutatingAccount) return;
    setIsMutatingAccount(true);
    try {
      await onUpdateAccount(editingAccount.id, { label: editingLabel.trim() });
      closeEditDialog();
    } finally {
      setIsMutatingAccount(false);
    }
  }

  async function handleToggleAccountStatus(account: MailboxDetail) {
    if (isMutatingAccount) return;
    setIsMutatingAccount(true);
    try {
      await onUpdateAccount(account.id, { status: getNextStatus(account.status) });
    } finally {
      setIsMutatingAccount(false);
    }
  }

  function openDeleteDialog(account: MailboxDetail) {
    setDeletingAccount(account);
  }

  function closeDeleteDialog() {
    setDeletingAccount(null);
  }

  async function handleDeleteAccount() {
    if (!deletingAccount || isMutatingAccount) return;
    setIsMutatingAccount(true);
    try {
      await onDeleteAccount(deletingAccount.id);
      closeDeleteDialog();
    } finally {
      setIsMutatingAccount(false);
    }
  }

  async function runHardDelete() {
    if (selectedIds.length === 0 || confirmationPhrase !== hardDeletePhrase || isMutatingAccount) return;
    const accountIds = [...selectedIds];
    setIsMutatingAccount(true);
    try {
      await onBulkDeleteAccounts(accountIds);
      closeHardDeleteDialog();
      setSelectedIds([]);
    } finally {
      setIsMutatingAccount(false);
    }
  }

  function toggleQuickFilter(value: Exclude<AccountsQuickFilter, "none">) {
    onQuickFilterChange(quickFilter === value ? "none" : value);
  }

  if (error) {
    return (
      <Page className="workspace-grid accounts-list-page">
        <PageMain className="panel workspace-card page-panel">
          <p className="section-copy">加载账号列表失败：{error}</p>
          <Button onClick={onRefresh} variant="primary">
            重试
          </Button>
        </PageMain>
      </Page>
    );
  }

  return (
    <>
      <Page className="workspace-grid accounts-list-page">
        <section className="panel workspace-card page-panel accounts-list-toolbar-card">
          <PageHeader
            actions={
              <div className="workspace-topbar-actions">
                <Button
                  disabled={isLoading}
                  isLoading={isLoading}
                  leadingIcon={<RefreshCw aria-hidden="true" />}
                  loadingLabel="刷新中"
                  onClick={onRefresh}
                  variant="secondary"
                >
                  刷新
                </Button>
                <Button leadingIcon={<Download aria-hidden="true" />} onClick={onExportAccounts} variant="primary">
                  导出
                </Button>
              </div>
            }
            kicker="账号中心"
          />

          <PageToolbar>
            <FilterBar className="accounts-list-filter-grid" columns={3}>
              <FormField label={<span className="sr-only">搜索账号</span>}>
                <SearchInput
                  aria-label="搜索账号"
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="搜索地址或创建人"
                  value={searchValue}
                />
              </FormField>
              <FormField label={<span className="sr-only">状态筛选</span>}>
                <SelectInput
                  aria-label="状态筛选"
                  onChange={(e) => onStatusFilterChange(e.target.value as AccountsStatusFilter)}
                  value={statusFilter}
                >
                  <option value="all">全部状态</option>
                  <option value="enabled">启用</option>
                  <option value="disabled">停用</option>
                  <option value="archived">已归档</option>
                  <option value="soft_deleted">已软删除</option>
                </SelectInput>
              </FormField>
              <FormField label={<span className="sr-only">最近活跃筛选</span>}>
                <SelectInput
                  aria-label="最近活跃筛选"
                  onChange={(e) => onActiveRangeChange(e.target.value as AccountsActiveRange)}
                  value={activeRange}
                >
                  <option value="all">全部活跃时间</option>
                  <option value="7d">近 7 天</option>
                  <option value="30d">近 30 天</option>
                  <option value="90d">近 90 天</option>
                </SelectInput>
              </FormField>
            </FilterBar>

            <FilterBarActions className="workspace-topbar-actions accounts-list-quick-filters">
              <Button
                aria-pressed={quickFilter === "anomaly"}
                isActive={quickFilter === "anomaly"}
                onClick={() => toggleQuickFilter("anomaly")}
                variant="ghost"
              >
                仅看异常
              </Button>
              <Button
                aria-pressed={quickFilter === "inactive"}
                isActive={quickFilter === "inactive"}
                onClick={() => toggleQuickFilter("inactive")}
                variant="ghost"
              >
                仅看长期不活跃
              </Button>
            </FilterBarActions>
          </PageToolbar>
        </section>

        <PageMain className="panel workspace-card page-panel accounts-list-table-card">
          <div className="workspace-card-header">
            <div>
              <p className="panel-kicker">账号列表</p>
            </div>
            <div className="workspace-topbar-actions">
              <Button leadingIcon={<Plus aria-hidden="true" />} onClick={openCreateDialog} variant="primary">
                新建账号
              </Button>
            </div>
          </div>

          {canManageAccounts && selectedCount > 0 ? (
            <section aria-label="批量操作条" className="panel workspace-card accounts-list-bulk-bar">
              <PageHeader
                actions={
                  <div className="workspace-topbar-actions">
                    <Popover onOpenChange={setIsMoreActionsOpen} open={isMoreActionsOpen}>
                      <PopoverTrigger className="ui-button ui-button-secondary ui-button-size-md accounts-list-more-trigger">
                        更多操作
                      </PopoverTrigger>
                      <PopoverContent align="end" aria-label="危险批量操作" className="accounts-list-more-actions">
                        <p className="panel-kicker">危险操作</p>
                        <Button
                          className="users-action-menu-item users-action-menu-item-danger"
                          onClick={() => {
                            setIsMoreActionsOpen(false);
                            openHardDeleteDialog();
                          }}
                          variant="ghost"
                        >
                          批量彻底删除
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                }
                kicker="批量操作"
                title={`已选择 ${selectedCount} 个账号`}
              />
            </section>
          ) : null}

          <TableContainer density="compact" variant="liquid">
            <Table className="accounts-list-table">
              <TableHead>
                <TableRow>
                  {canManageAccounts ? (
                    <TableHeaderCell align="center" className="ui-table-sticky-start" width={56}>
                      <CheckboxField
                        aria-label="选择全部账号"
                        checked={allVisibleSelected}
                        className="checkbox-row"
                        label={<span className="sr-only">选择全部账号</span>}
                        onChange={toggleSelectAll}
                      />
                    </TableHeaderCell>
                  ) : null}
                  <TableHeaderCell>地址</TableHeaderCell>
                  <TableHeaderCell>创建时间</TableHeaderCell>
                  <TableHeaderCell>状态</TableHeaderCell>
                  {canManageAccounts ? <TableHeaderCell>创建人</TableHeaderCell> : null}
                  <TableHeaderCell>最近活跃</TableHeaderCell>
                  <TableHeaderCell nowrap>邮件数量</TableHeaderCell>
                  <TableHeaderCell nowrap>发件数量</TableHeaderCell>
                  {canManageAccounts ? (
                    <TableHeaderCell className="ui-table-sticky-end" nowrap width={128}>
                      操作
                    </TableHeaderCell>
                  ) : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell className="ui-table-state-cell" colSpan={visibleColumnCount}>
                      <TableStateCard className="ui-table-state-card-plain" state="loading" title="正在加载账号列表" />
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell className="ui-table-state-cell" colSpan={visibleColumnCount}>
                      <TableStateCard description="创建账号或调整筛选后，可用邮箱账号会显示在这里。" title="暂无账号数据" />
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => {
                    const isSelected = selectedIds.includes(account.id);

                    return (
                      <TableRow isSelected={isSelected} key={account.id}>
                        {canManageAccounts ? (
                          <TableCell align="center" className="ui-table-sticky-start" width={56}>
                            <CheckboxField
                              aria-label={`选择账号 ${account.address}`}
                              checked={isSelected}
                              className="checkbox-row"
                              label={<span className="sr-only">选择账号 {account.address}</span>}
                              onChange={() => toggleSelection(account.id)}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>{account.address}</TableCell>
                        <TableCell>{formatDate(account.createdAt)}</TableCell>
                        <TableCell>
                          <div className="accounts-list-status-cell">
                            <Badge appearance="soft" statusRole="status" variant={getStatusBadgeVariant(account.status)}>
                              {statusLabelMap[account.status]}
                            </Badge>
                            {account.deletedAt ? <div className="section-copy">软删于 {formatDate(account.deletedAt)}</div> : null}
                          </div>
                        </TableCell>
                        {canManageAccounts ? <TableCell>{account.createdByName || "-"}</TableCell> : null}
                        <TableCell>{formatLastActive(account.lastActiveAt)}</TableCell>
                        <TableCell nowrap>{account.messageCount}</TableCell>
                        <TableCell nowrap>{account.outboundCount}</TableCell>
                        {canManageAccounts ? (
                          <TableCell className="ui-table-sticky-end" nowrap width={128}>
                            <div className="users-action-cell">
                              <AccountActionMenu
                                account={account}
                                onDelete={openDeleteDialog}
                                onEdit={openEditDialog}
                                onToggleStatus={(nextAccount) => void handleToggleAccountStatus(nextAccount)}
                              />
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            aria-label="账号列表分页"
            className="users-list-pagination"
            onChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={ACCOUNTS_PAGE_SIZE_OPTIONS}
            total={total}
          />
        </PageMain>
      </Page>

      {isCreateDialogOpen ? (
        <OverlayDialog closeLabel="关闭新建账号" eyebrow="新建账号" onClose={closeCreateDialog} title="创建新账号">
          <>
            <p className="section-copy">填写账号标签并选择可用域名，系统将生成邮箱地址。</p>
            <FormField label="账号标签" required>
              <TextInput
                aria-label="账号标签"
                onChange={(event) => setNewAccountLabel(event.target.value)}
                placeholder="例如：ops、admin、support"
                required
                type="text"
                value={newAccountLabel}
              />
            </FormField>
            <FormField label="邮箱域名" required>
              <SelectInput
                aria-label="邮箱域名"
                disabled={isLoadingDomains || availableDomains.length === 0}
                onChange={(event) => setNewAccountDomain(event.target.value)}
                required
                value={newAccountDomain}
              >
                <option disabled value="">
                  {domainPlaceholderLabel}
                </option>
                {availableDomains.map((domain) => (
                  <option key={domain.domain} value={domain.domain}>
                    {domain.domain}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            {requireCreatorNote ? (
              <FormField label="用途备注" required>
                <TextInput
                  aria-label="用途备注"
                  onChange={(event) => setNewAccountNote(event.target.value)}
                  placeholder="例如：市场活动回收、客服收件"
                  required
                  type="text"
                  value={newAccountNote}
                />
              </FormField>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button onClick={closeCreateDialog} variant="secondary">
                取消
              </Button>
              <Button disabled={!canCreateAccount} onClick={handleCreateAccount} variant="primary">
                {isCreating ? "创建中..." : "创建账号"}
              </Button>
            </div>
          </>
        </OverlayDialog>
      ) : null}

      {editingAccount ? (
        <OverlayDialog closeLabel="关闭修改账号" eyebrow="修改账号" onClose={closeEditDialog} title="修改账号">
          <>
            <p className="section-copy">{editingAccount.address}</p>
            <FormField label="账号标签">
              <TextInput
                aria-label="账号标签"
                onChange={(event) => setEditingLabel(event.target.value)}
                type="text"
                value={editingLabel}
              />
            </FormField>
            <div className="workspace-dialog-actions">
              <Button onClick={closeEditDialog} variant="secondary">
                取消
              </Button>
              <Button
                disabled={!editingLabel.trim() || isMutatingAccount}
                isLoading={isMutatingAccount}
                loadingLabel="保存中"
                onClick={() => void handleUpdateAccount()}
                variant="primary"
              >
                保存修改
              </Button>
            </div>
          </>
        </OverlayDialog>
      ) : null}

      {deletingAccount ? (
        <OverlayDialog closeLabel="关闭删除账号" eyebrow="删除账号" onClose={closeDeleteDialog} title="删除账号">
          <>
            <p className="section-copy">确认删除账号 {deletingAccount.address}？此操作会移除该账号。</p>
            <div className="workspace-dialog-actions">
              <Button onClick={closeDeleteDialog} variant="secondary">
                取消
              </Button>
              <Button
                disabled={isMutatingAccount}
                isLoading={isMutatingAccount}
                loadingLabel="删除中"
                onClick={() => void handleDeleteAccount()}
                variant="danger"
              >
                确认删除
              </Button>
            </div>
          </>
        </OverlayDialog>
      ) : null}

      {isHardDeleteDialogOpen ? (
        <OverlayDialog closeLabel="关闭彻底删除确认" eyebrow="危险操作" onClose={closeHardDeleteDialog} title="确认彻底删除">
          <>
            <p className="section-copy">此操作会永久移除 {selectedCount} 个账号，且无法恢复。</p>
            <p className="section-copy">其中 {selectedAccountsWithMailHistory} 个账号仍保留邮件或发件记录，请谨慎操作。</p>
            <p className="section-copy">请输入确认词后继续：</p>
            <p>
              <strong>{hardDeletePhrase}</strong>
            </p>
            <FormField label="确认词">
              <TextInput
                aria-label="确认词"
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                type="text"
                value={confirmationPhrase}
              />
            </FormField>
            <div className="workspace-dialog-actions">
              <Button onClick={closeHardDeleteDialog} variant="secondary">
                关闭
              </Button>
              <Button
                disabled={confirmationPhrase !== hardDeletePhrase || isMutatingAccount}
                isLoading={isMutatingAccount}
                loadingLabel="删除中"
                onClick={() => void runHardDelete()}
                variant="danger"
              >
                确认彻底删除
              </Button>
            </div>
          </>
        </OverlayDialog>
      ) : null}
    </>
  );
}
