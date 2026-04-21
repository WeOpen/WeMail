import type { FormEvent } from "react";

import type { OutboundHistoryItem } from "./types";
import { Button } from "../../shared/button";
import { FormField, TextInput, TextareaInput } from "../../shared/form";
import { OverlayDrawer } from "../../shared/overlay";

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
    <OverlayDrawer
      className="composer-panel"
      closeLabel="关闭发送测试邮件抽屉"
      eyebrow="外发通道"
      onClose={onClose}
      title="发送测试邮件"
      width="md"
    >
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
        <Button disabled={!selectedMailboxId} type="submit" variant="primary">
          发送邮件
        </Button>
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
    </OverlayDrawer>
  );
}
