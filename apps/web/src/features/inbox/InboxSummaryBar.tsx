import type { MailboxSummary } from "@wemail/shared";
import { ChevronDown, Inbox, Plus, Send, X } from "lucide-react";

import { Button } from "../../shared/button";
import { DateInput, FormField, SearchInput } from "../../shared/form";

type InboxSummaryBarProps = {
  selectedMailbox: MailboxSummary | null;
  mailboxCount: number;
  extractionCount: number;
  messageCount: number;
  attachmentCount: number;
  messageSearchValue: string;
  messageStartDate: string;
  messageEndDate: string;
  onOpenMailboxComposer: () => void;
  onClearMailboxSelection: () => void;
  onMessageDateFilterChange: (field: "startDate" | "endDate", value: string) => void;
  onMessageSearchChange: (value: string) => void;
  onOpenMailboxSelector: () => void;
  onOpenOutboundDrawer: () => void;
};

export function InboxSummaryBar({
  selectedMailbox,
  mailboxCount,
  extractionCount,
  messageCount,
  attachmentCount,
  messageSearchValue,
  messageStartDate,
  messageEndDate,
  onOpenMailboxComposer,
  onClearMailboxSelection,
  onMessageDateFilterChange,
  onMessageSearchChange,
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

      <div className="inbox-message-filters" aria-label="邮件列表筛选">
        <FormField className="inbox-message-search-field" label={<span className="sr-only">消息搜索</span>}>
          <SearchInput
            aria-label="消息搜索"
            onChange={(event) => onMessageSearchChange(event.target.value)}
            placeholder="搜索发件人 / 主题 / 内容 / 提取值"
            value={messageSearchValue}
          />
        </FormField>
        <FormField className="inbox-message-date-field" label="开始日期">
          <DateInput
            aria-label="按开始日期筛选"
            calendarLabel="打开开始日期选择器"
            onValueChange={(value) => onMessageDateFilterChange("startDate", value)}
            value={messageStartDate}
          />
        </FormField>
        <FormField className="inbox-message-date-field" label="结束日期">
          <DateInput
            aria-label="按结束日期筛选"
            calendarLabel="打开结束日期选择器"
            onValueChange={(value) => onMessageDateFilterChange("endDate", value)}
            value={messageEndDate}
          />
        </FormField>
      </div>
    </section>
  );
}
