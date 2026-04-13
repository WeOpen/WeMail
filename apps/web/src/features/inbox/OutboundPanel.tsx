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
          <p className="panel-kicker">外发通道</p>
          <h2>发送邮件</h2>
        </div>
      </div>
      <form className="composer-form outbound-form" onSubmit={onSendMail}>
        <label>
          收件人
          <input name="toAddress" type="email" required />
        </label>
        <label>
          主题
          <input name="subject" required />
        </label>
        <label>
          正文
          <textarea name="bodyText" rows={6} required />
        </label>
        <button className="workspace-action-button primary" type="submit" disabled={!selectedMailboxId}>
          发送邮件
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
        {outboundHistory.length === 0 ? <p className="empty-state">首次外发后，记录会显示在这里。</p> : null}
      </div>
    </section>
  );
}
