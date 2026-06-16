import type { MailboxSummary } from "@wemail/shared";
import { ChevronDown, Inbox, Plus, Send, X } from "lucide-react";

import { Button } from "../../shared/button";

type InboxSummaryBarProps = {
  selectedMailbox: MailboxSummary | null;
  mailboxCount: number;
  extractionCount: number;
  messageCount: number;
  attachmentCount: number;
  onOpenMailboxComposer: () => void;
  onClearMailboxSelection: () => void;
  onOpenMailboxSelector: () => void;
  onOpenOutboundDrawer: () => void;
};

export function InboxSummaryBar({
  selectedMailbox,
  mailboxCount,
  extractionCount,
  messageCount,
  attachmentCount,
  onOpenMailboxComposer,
  onClearMailboxSelection,
  onOpenMailboxSelector,
  onOpenOutboundDrawer
}: InboxSummaryBarProps) {
  const mailboxTriggerLabel = selectedMailbox?.label ?? "全部邮箱";
  const mailboxTriggerDescription = selectedMailbox?.address ?? "显示所有账号邮件";
  const hasSelectedMailbox = Boolean(selectedMailbox);

  return (
    <section aria-label="邮件列表工作台" className="panel workspace-card inbox-command-card">
      <div className="inbox-command-copy">
        <div className="inbox-command-icon" aria-hidden="true">
          <Inbox size={22} strokeWidth={1.9} />
        </div>
        <div className="inbox-summary-mailbox">
          <div className={hasSelectedMailbox ? "mailbox-select-trigger-shell has-selection" : "mailbox-select-trigger-shell"}>
            <Button className="mailbox-select-trigger" contentLayout="plain" onClick={onOpenMailboxSelector} variant="text">
              <span className="mailbox-select-trigger-copy">
                <strong>{mailboxTriggerLabel}</strong>
                <small>{mailboxTriggerDescription}</small>
              </span>
            </Button>
            <div className="mailbox-select-trigger-icons">
              {hasSelectedMailbox ? (
                <Button
                  aria-label="清除邮箱选择"
                  className="mailbox-select-clear"
                  iconOnly
                  onClick={(event) => {
                    event.stopPropagation();
                    onClearMailboxSelection();
                  }}
                  size="sm"
                  variant="icon"
                >
                  <X size={15} strokeWidth={2} aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                aria-label="打开邮箱选择"
                className="mailbox-select-chevron-button"
                iconOnly
                onClick={onOpenMailboxSelector}
                size="sm"
                variant="text"
              >
                <ChevronDown size={17} strokeWidth={1.9} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <dl aria-label="邮件摘要统计" className="inbox-summary-stats">
        <div>
          <dt>活跃邮箱</dt>
          <dd>{mailboxCount}</dd>
        </div>
        <div>
          <dt>待提取</dt>
          <dd>{extractionCount}</dd>
        </div>
        <div>
          <dt>当前消息</dt>
          <dd>{messageCount}</dd>
        </div>
        <div>
          <dt>附件</dt>
          <dd>{attachmentCount}</dd>
        </div>
      </dl>

      <div className="inbox-summary-actions">
        <Button leadingIcon={<Plus size={16} strokeWidth={1.9} aria-hidden="true" />} onClick={onOpenMailboxComposer} variant="secondary">
          新建邮箱
        </Button>
        <Button leadingIcon={<Send size={16} strokeWidth={1.9} aria-hidden="true" />} onClick={onOpenOutboundDrawer} variant="primary">
          发送测试邮件
        </Button>
      </div>
    </section>
  );
}
