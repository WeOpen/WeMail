import { useEffect, useMemo, useState } from "react";
import { Button } from "../../shared/button";
import { CheckboxField, FormField, SelectInput, TextInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow
} from "../../shared/table";
import { mailboxAccountsMockData, type MailboxAccountRecord, type MailboxAccountStatus } from "./accountsMockData";

const statusLabelMap: Record<MailboxAccountStatus, string> = {
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

function formatLastActive(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function updateSelectedAccounts(
  accounts: MailboxAccountRecord[],
  selectedIds: string[],
  updater: (account: MailboxAccountRecord) => MailboxAccountRecord | null
) {
  const selectedIdSet = new Set(selectedIds);

  return accounts.flatMap((account) => {
    if (!selectedIdSet.has(account.id)) {
      return account;
    }

    const nextAccount = updater(account);
    return nextAccount ? [nextAccount] : [];
  });
}

export function AccountsListPage() {
  const [accounts, setAccounts] = useState(mailboxAccountsMockData);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isHardDeleteDialogOpen, setIsHardDeleteDialogOpen] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedIds.includes(account.id)),
    [accounts, selectedIds]
  );

  const selectedCount = selectedAccounts.length;
  const allVisibleSelected = accounts.length > 0 && selectedCount === accounts.length;
  const hardDeletePhrase = `DELETE ${selectedCount} ACCOUNTS`;
  const selectedAccountsWithMailHistory = selectedAccounts.filter(
    (account) => account.messageCount > 0 || account.outboundCount > 0
  ).length;

  useEffect(() => {
    setConfirmationPhrase("");

    if (selectedCount === 0) {
      setIsMoreActionsOpen(false);
      setIsHardDeleteDialogOpen(false);
    }
  }, [selectedCount]);

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

  function runStatusBulkAction(status: MailboxAccountStatus) {
    setAccounts((currentAccounts) =>
      updateSelectedAccounts(currentAccounts, selectedIds, (account) => ({
        ...account,
        status,
        deletedAt: status === "soft_deleted" ? account.deletedAt ?? new Date().toISOString() : null
      }))
    );
    setSelectedIds([]);
  }

  function runSoftDelete() {
    const deletedAt = new Date().toISOString();

    setAccounts((currentAccounts) =>
      updateSelectedAccounts(currentAccounts, selectedIds, (account) => ({
        ...account,
        status: "soft_deleted",
        deletedAt: account.deletedAt ?? deletedAt
      }))
    );
    setSelectedIds([]);
  }

  function runHardDelete() {
    setAccounts((currentAccounts) => updateSelectedAccounts(currentAccounts, selectedIds, () => null));
    setSelectedIds([]);
    closeHardDeleteDialog();
  }

  return (
    <>
      <main className="workspace-grid accounts-list-page">
        <section className="panel workspace-card page-panel accounts-list-toolbar-card">
          <div className="workspace-card-header">
            <div>
              <p className="panel-kicker">账号中心</p>
            </div>
            <div className="workspace-topbar-actions">
              <Button variant="primary">导出</Button>
              <Button variant="secondary">刷新</Button>
            </div>
          </div>

          <div className="workspace-grid accounts-list-filter-grid">
            <FormField label={<span className="sr-only">搜索账号</span>}>
              <TextInput aria-label="搜索账号" placeholder="搜索 ID / 地址 / 创建人" type="search" />
            </FormField>
            <FormField label={<span className="sr-only">状态筛选</span>}>
              <SelectInput aria-label="状态筛选" defaultValue="all">
                <option value="all">全部状态</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
                <option value="archived">已归档</option>
                <option value="soft_deleted">已软删除</option>
              </SelectInput>
            </FormField>
            <FormField label={<span className="sr-only">创建人筛选</span>}>
              <SelectInput aria-label="创建人筛选" defaultValue="all">
                <option value="all">全部创建人</option>
                <option value="Will">Will</option>
                <option value="Ada">Ada</option>
                <option value="System">System</option>
              </SelectInput>
            </FormField>
            <FormField label={<span className="sr-only">最近活跃筛选</span>}>
              <SelectInput aria-label="最近活跃筛选" defaultValue="all">
                <option value="all">全部活跃时间</option>
                <option value="7d">近 7 天</option>
                <option value="30d">近 30 天</option>
                <option value="90d">近 90 天</option>
              </SelectInput>
            </FormField>
          </div>

          <div className="workspace-topbar-actions accounts-list-quick-filters">
            <Button variant="ghost">仅看异常</Button>
            <Button variant="ghost">仅看长期不活跃</Button>
          </div>
        </section>

        <section className="panel workspace-card page-panel accounts-list-table-card">
          <div className="workspace-card-header">
            <div>
              <p className="panel-kicker">账号列表</p>
            </div>
          </div>

          {selectedCount > 0 ? (
            <section aria-label="批量操作条" className="panel workspace-card accounts-list-bulk-bar">
              <div className="workspace-card-header">
                <div>
                  <p className="panel-kicker">批量操作</p>
                  <h4>已选择 {selectedCount} 个账号</h4>
                </div>
                <div className="workspace-topbar-actions">
                  <Button onClick={() => runStatusBulkAction("enabled")} variant="primary">
                    批量启用
                  </Button>
                  <Button onClick={() => runStatusBulkAction("disabled")} variant="secondary">
                    批量停用
                  </Button>
                  <Button onClick={() => runStatusBulkAction("archived")} variant="secondary">
                    批量归档
                  </Button>
                  <div>
                    <Button
                      aria-expanded={isMoreActionsOpen}
                      onClick={() => setIsMoreActionsOpen((current) => !current)}
                      variant="secondary"
                    >
                      更多操作
                    </Button>
                    {isMoreActionsOpen ? (
                      <div aria-label="危险批量操作" className="panel workspace-card accounts-list-more-actions" role="group">
                        <p className="panel-kicker">危险操作</p>
                        <Button onClick={runSoftDelete} variant="ghost">
                          批量软删除
                        </Button>
                        <Button onClick={openHardDeleteDialog} variant="danger">
                          批量彻底删除
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <TableContainer density="compact" variant="liquid">
            <Table className="accounts-list-table">
              <TableHead>
                <TableRow>
                  <TableHeaderCell align="center" className="ui-table-sticky-start" width={56}>
                    <CheckboxField
                      aria-label="选择全部账号"
                      checked={allVisibleSelected}
                      className="checkbox-row"
                      label={<span className="sr-only">选择全部账号</span>}
                      onChange={toggleSelectAll}
                    />
                  </TableHeaderCell>
                  <TableHeaderCell>ID</TableHeaderCell>
                  <TableHeaderCell>地址</TableHeaderCell>
                  <TableHeaderCell>创建时间</TableHeaderCell>
                  <TableHeaderCell>状态</TableHeaderCell>
                  <TableHeaderCell>创建人</TableHeaderCell>
                  <TableHeaderCell>最近活跃</TableHeaderCell>
                  <TableHeaderCell nowrap>邮件数量</TableHeaderCell>
                  <TableHeaderCell nowrap>发件数量</TableHeaderCell>
                  <TableHeaderCell className="ui-table-sticky-end" nowrap width={92}>
                    操作
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => {
                  const isSelected = selectedIds.includes(account.id);

                  return (
                    <TableRow isSelected={isSelected} key={account.id}>
                      <TableCell align="center" className="ui-table-sticky-start" width={56}>
                        <CheckboxField
                          aria-label={`选择账号 ${account.address}`}
                          checked={isSelected}
                          className="checkbox-row"
                          label={<span className="sr-only">选择账号 {account.address}</span>}
                          onChange={() => toggleSelection(account.id)}
                        />
                      </TableCell>
                      <TableCell>{account.id}</TableCell>
                      <TableCell>{account.address}</TableCell>
                      <TableCell>{formatDate(account.createdAt)}</TableCell>
                      <TableCell>
                        <div className="accounts-list-status-cell">
                          <span className={`accounts-status-pill accounts-status-pill--${account.status}`}>{statusLabelMap[account.status]}</span>
                          {account.deletedAt ? <div className="section-copy">软删于 {formatDate(account.deletedAt)}</div> : null}
                        </div>
                      </TableCell>
                      <TableCell>{account.createdBy}</TableCell>
                      <TableCell>{formatLastActive(account.lastActiveAt)}</TableCell>
                      <TableCell nowrap>{account.messageCount}</TableCell>
                      <TableCell nowrap>{account.outboundCount}</TableCell>
                      <TableCell className="ui-table-sticky-end" nowrap width={92}>
                        <Button className="accounts-list-row-action" size="sm" variant="ghost">
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </section>
      </main>

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
              <TextInput aria-label="确认词" onChange={(event) => setConfirmationPhrase(event.target.value)} type="text" value={confirmationPhrase} />
            </FormField>
            <div className="workspace-dialog-actions">
              <Button onClick={closeHardDeleteDialog} variant="secondary">
                关闭
              </Button>
              <Button
                disabled={confirmationPhrase !== hardDeletePhrase}
                onClick={runHardDelete}
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
