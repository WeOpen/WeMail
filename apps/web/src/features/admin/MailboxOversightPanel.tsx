import { useEffect, useState } from "react";

import type { MailboxSummary } from "@wemail/shared";

import { Badge } from "../../shared/badge";
import { Pagination } from "../../shared/pagination";

type MailboxOversightPanelProps = {
  adminMailboxes: MailboxSummary[];
};

const MAILBOX_PAGE_SIZE = 5;

export function MailboxOversightPanel({ adminMailboxes }: MailboxOversightPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const latestMailbox = [...adminMailboxes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const pageCount = Math.max(1, Math.ceil(adminMailboxes.length / MAILBOX_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const visibleMailboxes = adminMailboxes.slice((safePage - 1) * MAILBOX_PAGE_SIZE, safePage * MAILBOX_PAGE_SIZE);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  return (
    <section className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">地址概览</p>
          <h2>邮箱监管</h2>
          <p className="section-copy">查看当前系统中所有邮箱的标签与地址信息。</p>
        </div>
        <Badge variant={adminMailboxes.length > 0 ? "info" : "neutral"}>共 {adminMailboxes.length} 个</Badge>
      </div>
      {latestMailbox ? (
        <div className="users-mailbox-summary">
          <span>最近创建</span>
          <strong>{latestMailbox.label}</strong>
          <small>{latestMailbox.createdAt.slice(0, 10)}</small>
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
        {adminMailboxes.length === 0 ? <p className="empty-state">当前还没有可见的邮箱记录。</p> : null}
      </div>
      {adminMailboxes.length > MAILBOX_PAGE_SIZE ? (
        <Pagination
          aria-label="邮箱分页"
          className="users-settings-pagination"
          onChange={setCurrentPage}
          page={safePage}
          pageSize={MAILBOX_PAGE_SIZE}
          siblings={0}
          total={adminMailboxes.length}
        />
      ) : null}
    </section>
  );
}
