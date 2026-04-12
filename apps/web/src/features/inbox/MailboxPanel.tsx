import type { MailboxSummary } from "@wemail/shared";

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
          <p className="panel-kicker">Mailbox index</p>
          <h2>Active mailboxes</h2>
        </div>
        <button className="workspace-action-button secondary" onClick={onOpenMailboxComposer} type="button">
          New mailbox
        </button>
      </div>
      <div className="mailbox-list workspace-stack-list">
        {mailboxes.map((mailbox) => (
          <button
            key={mailbox.id}
            className={mailbox.id === selectedMailboxId ? "mailbox-item active" : "mailbox-item"}
            onClick={() => onSelectMailbox(mailbox.id)}
            type="button"
          >
            <strong>{mailbox.label}</strong>
            <span>{mailbox.address}</span>
          </button>
        ))}
        {mailboxes.length === 0 ? (
          <p className="empty-state">No mailbox is live yet. Create one to start routing inbound traffic.</p>
        ) : null}
      </div>
    </section>
  );
}
