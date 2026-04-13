import type { MessageSummary } from "@wemail/shared";

import { formatReceivedAt } from "./formatters";

type MessageStreamPanelProps = {
  messages: MessageSummary[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  onRefreshMessages: () => void;
};

export function MessageStreamPanel({
  messages,
  selectedMessageId,
  onSelectMessage,
  onRefreshMessages
}: MessageStreamPanelProps) {
  return (
    <section className="panel workspace-card inbox-panel">
      <div className="panel-header workspace-card-header">
        <div>
          <p className="panel-kicker">消息流</p>
          <h2>最新消息</h2>
        </div>
        <button className="workspace-action-button ghost" onClick={onRefreshMessages} type="button">
          刷新
        </button>
      </div>
      <div className="message-list workspace-stack-list">
        {messages.map((message) => (
          <button
            key={message.id}
            className={message.id === selectedMessageId ? "message-item active" : "message-item"}
            onClick={() => onSelectMessage(message.id)}
            type="button"
          >
            <strong>{message.subject}</strong>
            <span>{message.fromAddress}</span>
            <small>{formatReceivedAt(message.receivedAt)}</small>
          </button>
        ))}
        {messages.length === 0 ? <p className="empty-state">当前消息流为空，新邮件到达后会显示在这里。</p> : null}
      </div>
    </section>
  );
}
