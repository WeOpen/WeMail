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
          <p className="panel-kicker">Live stream</p>
          <h2>Recent messages</h2>
        </div>
        <button className="workspace-action-button ghost" onClick={onRefreshMessages} type="button">
          Refresh
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
        {messages.length === 0 ? <p className="empty-state">The stream is quiet. Incoming mail will appear here.</p> : null}
      </div>
    </section>
  );
}
