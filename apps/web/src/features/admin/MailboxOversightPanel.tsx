import type { MailboxSummary } from "@wemail/shared";

type MailboxOversightPanelProps = {
  adminMailboxes: MailboxSummary[];
};

export function MailboxOversightPanel({ adminMailboxes }: MailboxOversightPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">地址概览</p>
      <h2>邮箱总览</h2>
      <p className="section-copy">查看当前系统中所有邮箱的标签与地址信息。</p>
      <div className="stack-list workspace-stack-list">
        {adminMailboxes.map((mailbox) => (
          <div key={mailbox.id} className="stack-item admin-stack-item">
            <div>
              <strong>{mailbox.label}</strong>
              <span>{mailbox.address}</span>
            </div>
            <small>{mailbox.createdAt.slice(0, 10)}</small>
          </div>
        ))}
        {adminMailboxes.length === 0 ? <p className="empty-state">当前还没有可见的邮箱记录。</p> : null}
      </div>
    </section>
  );
}
