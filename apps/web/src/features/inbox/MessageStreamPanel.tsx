import { Download, Inbox, KeyRound, Link2, ListFilter, Minus, Paperclip, RefreshCw, Trash2, type LucideIcon } from "lucide-react";

import type { ExtractionType, MessageBatchAction, MessageFilter, MessageSummary } from "@wemail/shared";

import { Button } from "../../shared/button";
import { EmptyState } from "../../shared/empty-state/EmptyStatePrimitives";
import { FilterBar } from "../../shared/filter-bar";
import { Checkbox, FormField, SearchInput, SelectInput, TextInput } from "../../shared/form";
import { Pagination } from "../../shared/pagination";
import { Tabs, TabsList, TabsTrigger } from "../../shared/tabs";
import { toMessageListItemViewModel } from "./view-models";

export type MessageAttachmentFilter = "all" | "with" | "without";
export type MessageExtractionTypeFilter = "all" | ExtractionType;

export type MessageAdvancedFilters = {
  from: string;
  subject: string;
  startDate: string;
  endDate: string;
  hasAttachment: MessageAttachmentFilter;
  extractionType: MessageExtractionTypeFilter;
};

type MessageStreamPanelProps = {
  advancedFilters: MessageAdvancedFilters;
  filter: MessageFilter;
  errorMessage?: string | null;
  isBatchActionRunning?: boolean;
  isLoading?: boolean;
  messages: MessageSummary[];
  selectedMessageId: string | null;
  selectedMessageIds: string[];
  searchValue: string;
  page: number;
  pageSize: number;
  resultCount: number;
  onAdvancedFilterChange: (field: keyof MessageAdvancedFilters, value: string) => void;
  onFilterChange: (filter: MessageFilter) => void;
  onPageChange: (page: number) => void;
  onRunBatchAction: (action: MessageBatchAction) => void;
  onSelectMessage: (messageId: string) => void;
  onToggleMessageSelection: (messageId: string, selected: boolean) => void;
  onTogglePageSelection: (selected: boolean) => void;
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
  advancedFilters,
  filter,
  errorMessage = null,
  isBatchActionRunning = false,
  isLoading = false,
  messages,
  selectedMessageId,
  selectedMessageIds,
  searchValue,
  page,
  pageSize,
  resultCount,
  onAdvancedFilterChange,
  onFilterChange,
  onPageChange,
  onRunBatchAction,
  onSelectMessage,
  onToggleMessageSelection,
  onTogglePageSelection,
  onRefreshMessages,
  onSearchChange
}: MessageStreamPanelProps) {
  const selectedMessageIdSet = new Set(selectedMessageIds);
  const isCurrentPageSelected = messages.length > 0 && messages.every((message) => selectedMessageIdSet.has(message.id));
  const selectedCount = selectedMessageIds.length;

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

      <FilterBar className="message-advanced-toolbar" columns={3}>
        <FormField label="发件人">
          <TextInput
            aria-label="按发件人筛选"
            onChange={(event) => onAdvancedFilterChange("from", event.target.value)}
            placeholder="sender@example.com"
            value={advancedFilters.from}
          />
        </FormField>
        <FormField label="主题">
          <TextInput
            aria-label="按主题筛选"
            onChange={(event) => onAdvancedFilterChange("subject", event.target.value)}
            placeholder="主题关键词"
            value={advancedFilters.subject}
          />
        </FormField>
        <FormField label="附件">
          <SelectInput
            aria-label="按附件筛选"
            onChange={(event) => onAdvancedFilterChange("hasAttachment", event.target.value)}
            value={advancedFilters.hasAttachment}
          >
            <option value="all">全部</option>
            <option value="with">有附件</option>
            <option value="without">无附件</option>
          </SelectInput>
        </FormField>
        <FormField label="开始日期">
          <TextInput
            aria-label="按开始日期筛选"
            onChange={(event) => onAdvancedFilterChange("startDate", event.target.value)}
            type="date"
            value={advancedFilters.startDate}
          />
        </FormField>
        <FormField label="结束日期">
          <TextInput
            aria-label="按结束日期筛选"
            onChange={(event) => onAdvancedFilterChange("endDate", event.target.value)}
            type="date"
            value={advancedFilters.endDate}
          />
        </FormField>
        <FormField label="提取类型">
          <SelectInput
            aria-label="按提取类型筛选"
            onChange={(event) => onAdvancedFilterChange("extractionType", event.target.value)}
            value={advancedFilters.extractionType}
          >
            <option value="all">全部</option>
            <option value="auth_code">验证码</option>
            <option value="auth_link">登录链接</option>
            <option value="service_link">服务链接</option>
            <option value="subscription_link">订阅链接</option>
            <option value="other_link">其他链接</option>
            <option value="none">未提取</option>
          </SelectInput>
        </FormField>
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
        {messages.length > 0 ? (
          <div className="message-batch-toolbar" aria-label="邮件批量操作">
            <label className="message-batch-select-all">
              <Checkbox
                aria-label="选择当前页邮件"
                checked={isCurrentPageSelected}
                label={<span className="sr-only">选择当前页邮件</span>}
                onChange={(event) => onTogglePageSelection(event.currentTarget.checked)}
              />
              <span>选择当前页</span>
            </label>
            <span className="message-batch-count">已选 {selectedCount}</span>
            <div className="message-batch-actions">
              <Button
                disabled={selectedCount === 0 || isBatchActionRunning}
                leadingIcon={<Download size={14} strokeWidth={1.9} aria-hidden="true" />}
                onClick={() => onRunBatchAction("export")}
                size="sm"
                variant="secondary"
              >
                导出
              </Button>
              <Button
                disabled={selectedCount === 0 || isBatchActionRunning}
                isLoading={isBatchActionRunning}
                leadingIcon={<Trash2 size={14} strokeWidth={1.9} aria-hidden="true" />}
                loadingLabel="处理中"
                onClick={() => onRunBatchAction("delete")}
                size="sm"
                variant="danger"
              >
                删除
              </Button>
            </div>
          </div>
        ) : null}
        {messages.map((message) => {
          const viewModel = toMessageListItemViewModel(message);
          const ExtractionIcon = extractionIcons[viewModel.extractionChip.icon];
          const isSelected = selectedMessageIdSet.has(message.id);

          return (
            <div className={isSelected ? "message-selectable-item selected" : "message-selectable-item"} key={message.id}>
              <Checkbox
                aria-label={`选择邮件 ${viewModel.subject}`}
                checked={isSelected}
                label={<span className="sr-only">选择此邮件</span>}
                onChange={(event) => onToggleMessageSelection(message.id, event.currentTarget.checked)}
              />
              <Button
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
            </div>
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
