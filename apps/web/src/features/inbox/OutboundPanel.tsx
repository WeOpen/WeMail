import type { FormEvent } from "react";

import { outboundStatusLabels } from "@wemail/shared";

import { OutboundComposeDrawer } from "../outbound/OutboundComposeDrawer";
import type { OutboundHistoryItem } from "./types";

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
  return (
    <OutboundComposeDrawer
      closeLabel="关闭发送测试邮件抽屉"
      hasActiveMailbox={Boolean(selectedMailboxId)}
      onSendMail={onSendMail}
      onClose={onClose}
      open={open}
      title="发送测试邮件"
    >
      <div className="history-list workspace-stack-list">
        {outboundHistory.map((item) => (
          <div key={item.id} className="history-item">
            <strong>{item.subject}</strong>
            <span>{item.toAddress}</span>
            <small>{outboundStatusLabels[item.status]}</small>
          </div>
        ))}
        {outboundHistory.length === 0 ? <p className="empty-state">首次外发后，记录会显示在这里。</p> : null}
      </div>
    </OutboundComposeDrawer>
  );
}
