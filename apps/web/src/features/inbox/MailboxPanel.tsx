import type { MailboxSummary } from "@wemail/shared";
import { Button } from "../../shared/button";

type MailboxPanelProps = {
  mailboxes: MailboxSummary[];
  selectedMailboxId: string | null;
  onSelectMailbox: (mailboxId: string) => void;
  onOpenMailboxComposer: () => void;
};

export function MailboxPanel({
  mailboxes,
  selectedMailboxId,
  onSelectMailbox,
  onOpenMailboxComposer
}: MailboxPanelProps) {
  return (
    <section className="panel workspace-card mailbox-panel">
      <div className="panel-header workspace-card-header">
        <div>
          <p className="panel-kicker">邮箱导航</p>
          <h2>邮箱</h2>
        </div>
        <Button onClick={onOpenMailboxComposer} size="sm" variant="primary">
          新建
        </Button>
      </div>
      <div className="mailbox-list workspace-stack-list">
        {mailboxes.map((mailbox) => (
          <Button
            key={mailbox.id}
            className={mailbox.id === selectedMailboxId ? "mailbox-item active" : "mailbox-item"}
            contentLayout="plain"
            isActive={mailbox.id === selectedMailboxId}
            onClick={() => onSelectMailbox(mailbox.id)}
            variant="text"
          >
            <div className="mailbox-item-top">
              <strong>{mailbox.label}</strong>
              <small>{mailbox.createdAt.slice(0, 10)}</small>
            </div>
            <span>{mailbox.address}</span>
          </Button>
        ))}
        {mailboxes.length === 0 ? (
          <p className="empty-state">当前还没有激活邮箱，先创建一个开始接收邮件。</p>
        ) : null}
      </div>
    </section>
  );
}
