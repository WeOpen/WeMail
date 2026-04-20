import type { FormEvent } from "react";
import { X } from "lucide-react";

import type { OutboundHistoryItem } from "./types";
import { FormField, TextInput, TextareaInput } from "../../shared/form";

type OutboundPanelProps = {
  open: boolean;
  selectedMailboxId: string | null;
  outboundHistory: OutboundHistoryItem[];
  onClose: () => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function OutboundPanel({
  open,
  selectedMailboxId,
  outboundHistory,
  onClose,
  onSendMail
}: OutboundPanelProps) {
  if (!open) return null;

  return (
    <div className="workspace-drawer-backdrop" role="presentation">
      <section aria-labelledby="send-mail-drawer-title" aria-modal="true" className="workspace-drawer panel composer-panel" role="dialog">
        <div className="workspace-dialog-header">
          <div>
            <p className="panel-kicker">外发通道</p>
            <h2 id="send-mail-drawer-title">发送测试邮件</h2>
          </div>
          <button className="workspace-theme-toggle" onClick={onClose} type="button" aria-label="关闭发送测试邮件抽屉">
            <X absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
          </button>
        </div>
        <form className="composer-form outbound-form" onSubmit={onSendMail}>
          <FormField label="收件人" required>
            <TextInput name="toAddress" required type="email" />
          </FormField>
          <FormField label="主题" required>
            <TextInput name="subject" required />
          </FormField>
          <FormField label="正文" required>
            <TextareaInput name="bodyText" required rows={6} />
          </FormField>
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
    </div>
  );
}
