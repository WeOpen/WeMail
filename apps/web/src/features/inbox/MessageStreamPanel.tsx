import { Inbox, KeyRound, Link2, ListFilter, Minus, Paperclip, RefreshCw, type LucideIcon } from "lucide-react";

import type { MessageFilter, MessageSummary } from "@wemail/shared";

import { Button } from "../../shared/button";
import { EmptyState } from "../../shared/empty-state/EmptyStatePrimitives";
import { FilterBar } from "../../shared/filter-bar";
import { FormField, SearchInput } from "../../shared/form";
import { Pagination } from "../../shared/pagination";
import { Tabs, TabsList, TabsTrigger } from "../../shared/tabs";
import { toMessageListItemViewModel } from "./view-models";

type MessageStreamPanelProps = {
  filter: MessageFilter;
  errorMessage?: string | null;
  isLoading?: boolean;
  messages: MessageSummary[];
  selectedMessageId: string | null;
  searchValue: string;
  page: number;
  pageSize: number;
  resultCount: number;
  onFilterChange: (filter: MessageFilter) => void;
  onPageChange: (page: number) => void;
  onSelectMessage: (messageId: string) => void;
  onRefreshMessages: () => void;
  onSearchChange: (value: string) => void;
};

const filterLabels: Record<MessageFilter, string> = {
  all: "全部",
  code: "验证码",
  link: "链接",
  attachment: "附件",
  unparsed: "未提取"
};

const filterIcons: Record<MessageFilter, LucideIcon> = {
  all: ListFilter,
  code: KeyRound,
  link: Link2,
  attachment: Paperclip,
  unparsed: Inbox
};

const extractionIcons = {
  key: KeyRound,
  link: Link2,
  minus: Minus
} satisfies Record<string, LucideIcon>;

export function MessageStreamPanel({
  filter,
  errorMessage = null,
  isLoading = false,
  messages,
  selectedMessageId,
  searchValue,
  page,
  pageSize,
  resultCount,
  onFilterChange,
  onPageChange,
  onSelectMessage,
  onRefreshMessages,
  onSearchChange
}: MessageStreamPanelProps) {
  return (
    <section aria-label="消息筛选与列表" className="panel workspace-card inbox-panel message-workbench-panel">
      <div className="panel-header workspace-card-header message-panel-header">
        <p className="panel-kicker">邮件列表</p>
        <Button
          isLoading={isLoading}
          leadingIcon={<RefreshCw size={15} strokeWidth={1.9} aria-hidden="true" />}
          loadingLabel="刷新中"
          onClick={onRefreshMessages}
          size="sm"
          variant="primary"
        >
          刷新
        </Button>
      </div>

      <FilterBar className="message-toolbar" columns={2}>
        <FormField className="message-search-field" label={<span className="sr-only">消息搜索</span>}>
          <SearchInput
            aria-label="消息搜索"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索发件人 / 主题 / 内容 / 提取值"
            value={searchValue}
          />
        </FormField>
        <Tabs
          className="message-filter-tabs"
          onValueChange={(value) => onFilterChange(value as MessageFilter)}
          value={filter}
          variant="segmented"
        >
          <TabsList aria-label="消息快速筛选" className="message-filter-tabs-list">
            {(Object.keys(filterLabels) as MessageFilter[]).map((filterKey) => {
              const FilterIcon = filterIcons[filterKey];

              return (
                <TabsTrigger className="message-filter-tab" key={filterKey} value={filterKey}>
                  <FilterIcon className="message-filter-tab-icon" size={14} strokeWidth={2} aria-hidden="true" />
                  {filterLabels[filterKey]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </FilterBar>

      {errorMessage ? (
        <div className="message-list-status error-banner" role="alert">
          <span>{errorMessage}</span>
          <Button onClick={onRefreshMessages} size="sm" variant="secondary">
            重试加载邮件
          </Button>
        </div>
      ) : null}

      {isLoading && messages.length === 0 && !errorMessage ? (
        <p className="message-list-status empty-state" aria-live="polite">正在加载邮件...</p>
      ) : null}

      <div aria-label="消息结果列表" className="message-list inbox-message-list workspace-stack-list" role="group">
        {messages.map((message) => {
          const viewModel = toMessageListItemViewModel(message);
          const ExtractionIcon = extractionIcons[viewModel.extractionChip.icon];

          return (
            <Button
              key={message.id}
              className={message.id === selectedMessageId ? "message-item active" : "message-item"}
              contentLayout="plain"
              isActive={message.id === selectedMessageId}
              onClick={() => onSelectMessage(message.id)}
              variant="text"
            >
              <div className="message-item-header">
                <strong className="message-item-sender-name" title={viewModel.fromAddress}>
                  {viewModel.senderName}
                </strong>
                <small className="message-item-time">{viewModel.receivedAtLabel}</small>
              </div>
              <div className="message-item-top" aria-label="消息提取结果">
                <span className={`message-extraction-chip ${viewModel.extractionChip.tone}`}>
                  <ExtractionIcon className="message-extraction-chip-icon" size={15} strokeWidth={2.1} aria-hidden="true" />
                  <span className="message-extraction-chip-label">{viewModel.extractionChip.primary}</span>
                </span>
                {viewModel.attachmentCount > 0 ? (
                  <small className="message-item-attachment-chip">
                    <Paperclip size={14} strokeWidth={2} aria-hidden="true" />
                    <span>附件 {viewModel.attachmentCount}</span>
                  </small>
                ) : null}
              </div>
              <div className="message-item-main">
                <strong>{viewModel.subject}</strong>
              </div>
            </Button>
          );
        })}
        {messages.length === 0 && !isLoading && !errorMessage ? (
          <EmptyState
            className="message-empty-card"
            description="当前筛选下没有消息，切换筛选或等待新邮件到达。"
            icon={<Inbox size={26} strokeWidth={1.8} aria-hidden="true" />}
            title="暂无邮件"
          />
        ) : null}
      </div>

      <Pagination
        aria-label="消息列表分页"
        className="message-pagination"
        onChange={onPageChange}
        page={page}
        pageSize={pageSize}
        total={resultCount}
      />
    </section>
  );
}
