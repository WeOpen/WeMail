import { useMemo, useState } from "react";

import type { MessageSummary } from "@wemail/shared";

import { toMessageListItemViewModel } from "./view-models";

type MessageStreamPanelProps = {
  messages: MessageSummary[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  onRefreshMessages: () => void;
};

type MessageFilter = "all" | "code" | "link";

function filterMessages(messages: MessageSummary[], filter: MessageFilter) {
  if (filter === "code") {
    return messages.filter((message) => message.extraction.type === "auth_code");
  }

  if (filter === "link") {
    return messages.filter((message) => message.extraction.type !== "auth_code" && message.extraction.type !== "none");
  }

  return messages;
}

export function MessageStreamPanel({
  messages,
  selectedMessageId,
  onSelectMessage,
  onRefreshMessages
}: MessageStreamPanelProps) {
  const [filter, setFilter] = useState<MessageFilter>("all");
  const visibleMessages = useMemo(() => filterMessages(messages, filter), [messages, filter]);

  return (
    <section className="panel workspace-card inbox-panel">
      <div className="panel-header workspace-card-header">
        <div>
          <p className="panel-kicker">消息流</p>
          <h2>消息列表</h2>
        </div>
        <button className="workspace-action-button ghost" onClick={onRefreshMessages} type="button">
          刷新
        </button>
      </div>
      <div aria-label="消息快速筛选" className="message-filter-row" role="toolbar">
        <button
          aria-pressed={filter === "all"}
          className="workspace-action-button ghost"
          onClick={() => setFilter("all")}
          type="button"
        >
          全部
        </button>
        <button
          aria-pressed={filter === "code"}
          className="workspace-action-button ghost"
          onClick={() => setFilter("code")}
          type="button"
        >
          仅看验证码
        </button>
        <button
          aria-pressed={filter === "link"}
          className="workspace-action-button ghost"
          onClick={() => setFilter("link")}
          type="button"
        >
          仅看链接
        </button>
      </div>
      <div className="message-list workspace-stack-list">
        {visibleMessages.map((message) => {
          const viewModel = toMessageListItemViewModel(message);

          return (
            <button
              key={message.id}
              className={message.id === selectedMessageId ? "message-item active" : "message-item"}
              onClick={() => onSelectMessage(message.id)}
              type="button"
            >
              <div className="message-item-top">
                <span className={`message-extraction-chip ${viewModel.extractionChip.tone}`}>{viewModel.extractionChip.primary}</span>
                <small>{viewModel.receivedAtLabel}</small>
              </div>
              <strong>{viewModel.fromAddress}</strong>
              <span>{viewModel.subject}</span>
              <div className="message-item-meta">
                <small>{viewModel.extractionChip.secondary}</small>
                {viewModel.attachmentCount > 0 ? <small>附件 {viewModel.attachmentCount}</small> : null}
              </div>
            </button>
          );
        })}
        {visibleMessages.length === 0 ? <p className="empty-state">当前筛选下没有消息，切换筛选或等待新邮件到达。</p> : null}
      </div>
    </section>
  );
}
