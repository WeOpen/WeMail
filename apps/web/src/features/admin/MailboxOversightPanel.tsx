import type { MailboxSummary } from "@wemail/shared";

type MailboxOversightPanelProps = {
  adminMailboxes: MailboxSummary[];
};

export function MailboxOversightPanel({ adminMailboxes }: MailboxOversightPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">Address map</p>
      <h2>Mailbox oversight</h2>
      <p className="section-copy">Inspect every created mailbox label and address from the unified operator surface.</p>
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
        {adminMailboxes.length === 0 ? <p className="empty-state">No mailbox records are visible yet.</p> : null}
      </div>
    </section>
  );
}
