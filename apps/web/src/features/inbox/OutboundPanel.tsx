import type { FormEvent } from "react";
import type { OutboundHistoryItem } from "./types";

type OutboundPanelProps = {
  selectedMailboxId: string | null;
  outboundHistory: OutboundHistoryItem[];
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function OutboundPanel({
  selectedMailboxId,
  outboundHistory,
  onSendMail
}: OutboundPanelProps) {
  return (
    <section className="panel workspace-card composer-panel">
      <div className="panel-header workspace-card-header">
        <div>
          <p className="panel-kicker">Outbound lane</p>
          <h2>Send follow-ups</h2>
        </div>
      </div>
      <form className="composer-form outbound-form" onSubmit={onSendMail}>
        <label>
          Recipient
          <input name="toAddress" type="email" required />
        </label>
        <label>
          Subject
          <input name="subject" required />
        </label>
        <label>
          Body
          <textarea name="bodyText" rows={6} required />
        </label>
        <button className="workspace-action-button primary" type="submit" disabled={!selectedMailboxId}>
          Send message
        </button>
      </form>
      <div className="history-list workspace-stack-list">
        {outboundHistory.map((item) => (
          <div key={item.id} className="history-item">
            <strong>{item.subject}</strong>
            <span>{item.toAddress}</span>
            <small>{item.status}</small>
          </div>
        ))}
        {outboundHistory.length === 0 ? <p className="empty-state">Outbound history will land here after the first send.</p> : null}
      </div>
    </section>
  );
}
