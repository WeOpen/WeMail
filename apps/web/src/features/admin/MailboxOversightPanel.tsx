import { useEffect, useState } from "react";

import type { MailboxSummary } from "@wemail/shared";

import { Badge } from "../../shared/badge";
import { Pagination } from "../../shared/pagination";

type MailboxOversightPanelProps = {
  adminMailboxes: MailboxSummary[];
  latestMailbox?: MailboxSummary | null;
  mailboxesPage?: number;
  mailboxesPageSize?: number;
  mailboxesTotal?: number;
  onMailboxPageChange?: (page: number) => Promise<void>;
};

const MAILBOX_PAGE_SIZE = 5;

export function MailboxOversightPanel({
  adminMailboxes,
  latestMailbox,
  mailboxesPage,
  mailboxesPageSize,
  mailboxesTotal,
  onMailboxPageChange
}: MailboxOversightPanelProps) {
  const [localPage, setLocalPage] = useState(1);
  const isRemotePaged = Boolean(onMailboxPageChange);
  const pageSize = mailboxesPageSize ?? MAILBOX_PAGE_SIZE;
  const total = mailboxesTotal ?? adminMailboxes.length;
  const currentPage = mailboxesPage ?? localPage;
  const currentLatestMailbox = latestMailbox ?? [...adminMailboxes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const visibleMailboxes = isRemotePaged ? adminMailboxes : adminMailboxes.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (!isRemotePaged && localPage > pageCount) {
      setLocalPage(pageCount);
    }
  }, [isRemotePaged, localPage, pageCount]);

  function handlePageChange(page: number) {
    if (onMailboxPageChange) {
      void onMailboxPageChange(page);
      return;
    }
    setLocalPage(page);
  }

  return (
    <section className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">地址概览</p>
          <h2>邮箱监管</h2>
          <p className="section-copy">查看当前系统中所有邮箱的标签与地址信息。</p>
        </div>
        <Badge variant={total > 0 ? "info" : "neutral"}>共 {total} 个</Badge>
      </div>
      {currentLatestMailbox ? (
        <div className="users-mailbox-summary">
          <span>最近创建</span>
          <strong>{currentLatestMailbox.label}</strong>
          <small>{currentLatestMailbox.createdAt.slice(0, 10)}</small>
        </div>
      ) : null}
      <div className="stack-list workspace-stack-list users-settings-list" role="list">
        {visibleMailboxes.map((mailbox) => (
          <div key={mailbox.id} className="stack-item admin-stack-item users-settings-row users-mailbox-row" role="listitem">
            <strong className="users-mailbox-row-name">{mailbox.label}</strong>
            <div className="users-mailbox-row-details">
              <span className="users-mailbox-row-address">{mailbox.address}</span>
              <small className="users-mailbox-row-created">创建于 {mailbox.createdAt.slice(0, 10)}</small>
            </div>
          </div>
        ))}
        {total === 0 ? <p className="empty-state">当前还没有可见的邮箱记录。</p> : null}
      </div>
      {total > pageSize ? (
        <Pagination
          aria-label="邮箱分页"
          className="users-settings-pagination"
          onChange={handlePageChange}
          page={safePage}
          pageSize={pageSize}
          siblings={0}
          total={total}
        />
      ) : null}
    </section>
  );
}
