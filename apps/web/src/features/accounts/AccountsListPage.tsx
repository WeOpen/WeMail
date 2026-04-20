import { useEffect, useMemo, useState } from "react";
import { CheckboxField, FormField, SelectInput, TextInput } from "../../shared/form";
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
              <h2>账号列表</h2>
            </div>
            <div className="workspace-topbar-actions">
              <button className="workspace-action-button secondary" type="button">
                导出
              </button>
              <button className="workspace-action-button ghost" type="button">
                刷新
              </button>
            </div>
          </div>

          <p className="section-copy">第一版先把邮箱账号的列表骨架替换成真实表格壳层，便于后续接入批量管理与生命周期操作。</p>

          <div className="workspace-grid accounts-list-filter-grid">
            <FormField label={<span className="sr-only">搜索账号</span>}>
              <TextInput aria-label="搜索账号" placeholder="搜索 ID / 地址 / 标签 / 创建人" type="search" />
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
            <FormField label={<span className="sr-only">标签筛选</span>}>
              <SelectInput aria-label="标签筛选" defaultValue="all">
                <option value="all">全部标签</option>
                <option value="运营">运营</option>
                <option value="增长">增长</option>
                <option value="历史">历史</option>
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
            <button className="workspace-action-button ghost" type="button">
              仅看异常
            </button>
            <button className="workspace-action-button ghost" type="button">
              仅看长期不活跃
            </button>
          </div>
        </section>

        <section className="panel workspace-card page-panel accounts-list-table-card">
          <div className="workspace-card-header">
            <div>
              <p className="panel-kicker">邮箱账号</p>
              <h3>批量管理表格壳层</h3>
            </div>
            <span className="section-copy">共 {accounts.length} 个账号</span>
          </div>

          {selectedCount > 0 ? (
            <section aria-label="批量操作条" className="panel workspace-card accounts-list-bulk-bar">
              <div className="workspace-card-header">
                <div>
                  <p className="panel-kicker">批量操作</p>
                  <h4>已选择 {selectedCount} 个账号</h4>
                </div>
                <div className="workspace-topbar-actions">
                  <button className="workspace-action-button secondary" onClick={() => runStatusBulkAction("enabled")} type="button">
                    批量启用
                  </button>
                  <button className="workspace-action-button secondary" onClick={() => runStatusBulkAction("disabled")} type="button">
                    批量停用
                  </button>
                  <button className="workspace-action-button secondary" onClick={() => runStatusBulkAction("archived")} type="button">
                    批量归档
                  </button>
                  <div>
                    <button
                      aria-expanded={isMoreActionsOpen}
                      className="workspace-action-button ghost"
                      onClick={() => setIsMoreActionsOpen((current) => !current)}
                      type="button"
                    >
                      更多操作
                    </button>
                    {isMoreActionsOpen ? (
                      <div aria-label="危险批量操作" className="panel workspace-card accounts-list-more-actions" role="group">
                        <p className="panel-kicker">危险操作</p>
                        <button className="workspace-action-button ghost" onClick={runSoftDelete} type="button">
                          批量软删除
                        </button>
                        <button className="workspace-action-button danger" onClick={openHardDeleteDialog} type="button">
                          批量彻底删除
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="accounts-list-table-shell">
            <table className="accounts-list-table">
              <thead>
                <tr>
                  <th className="accounts-list-checkbox-cell" scope="col">
                    <CheckboxField
                      aria-label="选择全部账号"
                      checked={allVisibleSelected}
                      className="checkbox-row"
                      label={<span className="sr-only">选择全部账号</span>}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col">ID</th>
                  <th scope="col">地址</th>
                  <th scope="col">创建时间</th>
                  <th scope="col">标签</th>
                  <th scope="col">状态</th>
                  <th scope="col">创建人</th>
                  <th scope="col">最近活跃</th>
                  <th className="accounts-list-number-cell" scope="col">
                    邮件数量
                  </th>
                  <th className="accounts-list-number-cell" scope="col">
                    发件数量
                  </th>
                  <th className="accounts-list-actions-cell" scope="col">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const isSelected = selectedIds.includes(account.id);

                  return (
                    <tr key={account.id}>
                      <td className="accounts-list-checkbox-cell">
                        <CheckboxField
                          aria-label={`选择账号 ${account.address}`}
                          checked={isSelected}
                          className="checkbox-row"
                          label={<span className="sr-only">选择账号 {account.address}</span>}
                          onChange={() => toggleSelection(account.id)}
                        />
                      </td>
                      <td>{account.id}</td>
                      <td>{account.address}</td>
                      <td>{formatDate(account.createdAt)}</td>
                      <td>
                        <div className="accounts-list-tag-list">
                          {account.tags.map((tag) => (
                            <span className="accounts-list-tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="accounts-list-status-cell">
                          <span className={`accounts-status-pill accounts-status-pill--${account.status}`}>{statusLabelMap[account.status]}</span>
                          {account.deletedAt ? <div className="section-copy">软删于 {formatDate(account.deletedAt)}</div> : null}
                        </div>
                      </td>
                      <td>{account.createdBy}</td>
                      <td>{formatLastActive(account.lastActiveAt)}</td>
                      <td className="accounts-list-number-cell">{account.messageCount}</td>
                      <td className="accounts-list-number-cell">{account.outboundCount}</td>
                      <td className="accounts-list-actions-cell">
                        <button className="workspace-action-button ghost accounts-list-row-action" type="button">
                          查看
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {isHardDeleteDialogOpen ? (
        <div className="workspace-dialog-backdrop" role="presentation">
          <section aria-labelledby="hard-delete-dialog-title" aria-modal="true" className="workspace-dialog panel" role="dialog">
            <div className="workspace-dialog-header">
              <div>
                <p className="panel-kicker">危险操作</p>
                <h2 id="hard-delete-dialog-title">确认彻底删除</h2>
              </div>
              <button className="workspace-action-button ghost" onClick={closeHardDeleteDialog} type="button">
                取消
              </button>
            </div>
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
              <button className="workspace-action-button secondary" onClick={closeHardDeleteDialog} type="button">
                关闭
              </button>
              <button
                className="workspace-action-button danger"
                disabled={confirmationPhrase !== hardDeletePhrase}
                onClick={runHardDelete}
                type="button"
              >
                确认彻底删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
