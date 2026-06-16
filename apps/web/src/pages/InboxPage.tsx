import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { MailDomainSummary, MailboxSummary, MessageFilter, MessageListSummary, MessageSummary, UserRole } from "@wemail/shared";

import { InboxSummaryBar } from "../features/inbox/InboxSummaryBar";
import { MessageDetailPanel } from "../features/inbox/MessageDetailPanel";
import { MessageStreamPanel } from "../features/inbox/MessageStreamPanel";
import { OutboundPanel } from "../features/inbox/OutboundPanel";
import type { MailboxCreatePayload, MailboxListQueryInput, MailboxListResponse, MessageListQueryInput } from "../features/inbox/api";
import type { OutboundHistoryItem } from "../features/inbox/types";
import { Button } from "../shared/button";
import { FormField, SearchInput, SelectInput, TextInput } from "../shared/form";
import { OverlayDialog } from "../shared/overlay";
import { Pagination } from "../shared/pagination";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "../shared/table";

type InboxPageProps = {
  availableDomains: MailDomainSummary[];
  currentUserRole?: UserRole;
  isLoadingDomains: boolean;
  mailboxes: MailboxSummary[];
  selectedMailboxId: string | null;
  messages: MessageSummary[];
  isLoadingMessages: boolean;
  messageListError: string | null;
  messageListPage: number;
  messageListPageSize: number;
  messageListSummary: MessageListSummary;
  messageListTotal: number;
  selectedMessageId: string | null;
  selectedMessage: MessageSummary | null;
  isLoadingSelectedMessage: boolean;
  selectedMessageError: string | null;
  outboundHistory: OutboundHistoryItem[];
  mailboxComposerOpen: boolean;
  messageRefreshIntervalMs?: number;
  requireCreatorNote?: boolean;
  onCloseMailboxComposer: () => void;
  onCreateMailbox: (payload: MailboxCreatePayload) => Promise<void>;
  onOpenMailboxComposer: () => void;
  onQueryMailboxes: (query: MailboxListQueryInput) => Promise<Required<MailboxListResponse>>;
  onSelectMailbox: (mailboxId: string | null) => void;
  onSelectMessage: (messageId: string) => void;
  onRefreshMessages: (query?: MessageListQueryInput | string | null) => Promise<void>;
  onRetrySelectedMessage: (messageId?: string | null) => Promise<void>;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

const messagePageSize = 10;
const messageSearchDebounceMs = 300;
const defaultMessageRefreshIntervalMs = 30_000;
const mailboxPageSize = 4;
const mailboxPageSizeOptions = [4, 8, 12] as const;

function formatMailboxCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function InboxPage({
  availableDomains,
  currentUserRole = "member",
  isLoadingDomains,
  mailboxes,
  selectedMailboxId,
  messages,
  isLoadingMessages,
  messageListError,
  messageListPage,
  messageListPageSize,
  messageListSummary,
  messageListTotal,
  selectedMessageId,
  selectedMessage,
  isLoadingSelectedMessage,
  selectedMessageError,
  outboundHistory,
  mailboxComposerOpen,
  messageRefreshIntervalMs = defaultMessageRefreshIntervalMs,
  requireCreatorNote = false,
  onCloseMailboxComposer,
  onCreateMailbox,
  onOpenMailboxComposer,
  onQueryMailboxes,
  onSelectMailbox,
  onSelectMessage,
  onRefreshMessages,
  onRetrySelectedMessage,
  onSendMail
}: InboxPageProps) {
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("");
  const [creatorNote, setCreatorNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outboundDrawerOpen, setOutboundDrawerOpen] = useState(false);
  const [mailboxSelectorOpen, setMailboxSelectorOpen] = useState(false);
  const [mailboxSearchValue, setMailboxSearchValue] = useState("");
  const [mailboxPage, setMailboxPage] = useState(1);
  const [mailboxSelectorPageSize, setMailboxSelectorPageSize] = useState(mailboxPageSize);
  const [mailboxSelectorMailboxes, setMailboxSelectorMailboxes] = useState<MailboxSummary[]>([]);
  const [mailboxSelectorTotal, setMailboxSelectorTotal] = useState(0);
  const [isLoadingMailboxSelector, setIsLoadingMailboxSelector] = useState(false);
  const [mailboxSelectorError, setMailboxSelectorError] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [messageSearchValue, setMessageSearchValue] = useState("");
  const [debouncedMessageSearchValue, setDebouncedMessageSearchValue] = useState("");
  const [messagePage, setMessagePage] = useState(1);
  const canViewMailboxCreator = currentUserRole === "admin";
  const mailboxSelectorColumnCount = canViewMailboxCreator ? 5 : 4;

  const suggestedLabel = useMemo(() => `Mailbox ${mailboxes.length + 1}`, [mailboxes.length]);
  const selectedMailbox = useMemo(
    () => mailboxes.find((mailbox) => mailbox.id === selectedMailboxId) ?? null,
    [mailboxes, selectedMailboxId]
  );
  const outboundMailboxId = selectedMailboxId ?? mailboxes[0]?.id ?? null;
  const messageQuery = useMemo<MessageListQueryInput>(() => {
    const search = debouncedMessageSearchValue.trim();

    return {
      mailboxId: selectedMailboxId,
      page: messagePage,
      pageSize: messagePageSize,
      filter: messageFilter,
      ...(search ? { search } : {})
    };
  }, [debouncedMessageSearchValue, messageFilter, messagePage, selectedMailboxId]);
  const mailboxSelectorQuery = useMemo<MailboxListQueryInput>(() => ({
    page: mailboxPage,
    pageSize: mailboxSelectorPageSize,
    ...(mailboxSearchValue.trim() ? { search: mailboxSearchValue.trim() } : {})
  }), [mailboxPage, mailboxSearchValue, mailboxSelectorPageSize]);
  const safeMessagePage = Math.min(messageListPage, Math.max(1, Math.ceil(messageListTotal / messageListPageSize)));
  const safeMailboxPage = Math.min(mailboxPage, Math.max(1, Math.ceil(mailboxSelectorTotal / mailboxSelectorPageSize)));
  const detailMessage = selectedMessage ?? messages.find((message) => message.id === selectedMessageId) ?? messages[0] ?? null;
  const activeMessageId = detailMessage?.id ?? null;
  const canCreateMailbox =
    Boolean(label.trim()) &&
    Boolean(domain) &&
    (!requireCreatorNote || Boolean(creatorNote.trim())) &&
    !isSubmitting &&
    !isLoadingDomains;
  const domainPlaceholderLabel = isLoadingDomains ? "加载域名中" : availableDomains.length === 0 ? "暂无可用域名" : "请选择域名";

  useEffect(() => {
    if (mailboxComposerOpen) {
      setLabel(suggestedLabel);
      setDomain("");
      setCreatorNote("");
      setIsSubmitting(false);
    }
  }, [mailboxComposerOpen, suggestedLabel]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedMessageSearchValue(messageSearchValue.trim());
    }, messageSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [messageSearchValue]);

  useEffect(() => {
    void onRefreshMessages(messageQuery);
  }, [messageQuery, onRefreshMessages]);

  useEffect(() => {
    if (messageRefreshIntervalMs <= 0) return undefined;

    const interval = window.setInterval(() => {
      void onRefreshMessages(messageQuery);
    }, messageRefreshIntervalMs);

    return () => window.clearInterval(interval);
  }, [messageQuery, messageRefreshIntervalMs, onRefreshMessages]);

  useEffect(() => {
    setMailboxPage(1);
  }, [mailboxSearchValue, mailboxSelectorOpen]);

  useEffect(() => {
    if (!mailboxSelectorOpen) return undefined;

    let isActive = true;
    setIsLoadingMailboxSelector(true);

    void onQueryMailboxes(mailboxSelectorQuery)
      .then((result) => {
        if (!isActive) return;
        setMailboxSelectorMailboxes(result.mailboxes);
        setMailboxSelectorTotal(result.total);
        setMailboxSelectorError(null);
      })
      .catch((error) => {
        if (!isActive) return;
        setMailboxSelectorMailboxes([]);
        setMailboxSelectorTotal(0);
        setMailboxSelectorError(error instanceof Error ? error.message : "邮箱列表加载失败");
      })
      .finally(() => {
        if (isActive) setIsLoadingMailboxSelector(false);
      });

    return () => {
      isActive = false;
    };
  }, [mailboxSelectorOpen, mailboxSelectorQuery, onQueryMailboxes]);

  useEffect(() => {
    setMessagePage(1);
  }, [selectedMailboxId]);

  const handleCreateMailbox = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLabel = label.trim();
    if (!canCreateMailbox || !nextLabel) return;

    setIsSubmitting(true);
    try {
      await onCreateMailbox({
        label: nextLabel,
        domain,
        ...(requireCreatorNote ? { creatorNote: creatorNote.trim() } : {})
      });
      setLabel("");
      setDomain("");
      setCreatorNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMailbox = (mailboxId: string | null) => {
    onSelectMailbox(mailboxId);
    setMailboxSearchValue("");
    setMessagePage(1);
    setMailboxSelectorOpen(false);
  };

  const handleClearMailboxSelection = () => {
    onSelectMailbox(null);
    setMessagePage(1);
  };

  const handleMessageFilterChange = (filter: MessageFilter) => {
    setMessageFilter(filter);
    setMessagePage(1);
  };

  const handleMessageSearchChange = (value: string) => {
    setMessageSearchValue(value);
    if (!value.trim()) setDebouncedMessageSearchValue("");
    setMessagePage(1);
  };

  const handleMailboxPageSizeChange = (pageSize: number) => {
    setMailboxSelectorPageSize(pageSize);
    setMailboxPage(1);
  };

  return (
    <>
      <main className="workspace-grid inbox-page-grid">
        <InboxSummaryBar
          attachmentCount={messageListSummary.attachmentCount}
          extractionCount={messageListSummary.extractionCount}
          mailboxCount={mailboxes.length}
          messageCount={messageListSummary.messageCount}
          onClearMailboxSelection={handleClearMailboxSelection}
          onOpenMailboxComposer={onOpenMailboxComposer}
          onOpenMailboxSelector={() => setMailboxSelectorOpen(true)}
          onOpenOutboundDrawer={() => setOutboundDrawerOpen(true)}
          selectedMailbox={selectedMailbox}
        />
        <div className="workspace-grid inbox-grid">
          <MessageStreamPanel
            filter={messageFilter}
            messages={messages}
            page={safeMessagePage}
            pageSize={messageListPageSize}
            resultCount={messageListTotal}
            selectedMessageId={activeMessageId}
            searchValue={messageSearchValue}
            isLoading={isLoadingMessages}
            errorMessage={messageListError}
            onFilterChange={handleMessageFilterChange}
            onPageChange={setMessagePage}
            onRefreshMessages={() => void onRefreshMessages(messageQuery)}
            onSearchChange={handleMessageSearchChange}
            onSelectMessage={onSelectMessage}
          />
          <MessageDetailPanel
            errorMessage={selectedMessageError}
            isLoading={isLoadingSelectedMessage}
            selectedMessage={detailMessage}
            onRetry={() => void onRetrySelectedMessage(activeMessageId)}
          />
        </div>
      </main>
      <OutboundPanel
        open={outboundDrawerOpen}
        outboundHistory={outboundHistory}
        selectedMailboxId={outboundMailboxId}
        onClose={() => setOutboundDrawerOpen(false)}
        onSendMail={onSendMail}
      />

      {mailboxComposerOpen ? (
        <OverlayDialog
          closeLabel="关闭新建邮箱"
          eyebrow="新建邮箱"
          onClose={onCloseMailboxComposer}
          title="创建新邮箱"
        >
          <form className="composer-form workspace-dialog-form" onSubmit={(event) => void handleCreateMailbox(event)}>
            <p className="section-copy">填写邮箱标签并选择可用域名，系统将生成邮箱地址。</p>
            <FormField label="邮箱标签" required>
              <TextInput
                aria-label="邮箱标签"
                name="mailboxLabel"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="例如：ops、admin、support"
                required
                type="text"
                value={label}
              />
            </FormField>
            <FormField label="邮箱域名" required>
              <SelectInput
                aria-label="邮箱域名"
                disabled={isLoadingDomains || availableDomains.length === 0}
                name="mailboxDomain"
                onChange={(event) => setDomain(event.target.value)}
                required
                value={domain}
              >
                <option disabled value="">
                  {domainPlaceholderLabel}
                </option>
                {availableDomains.map((mailDomain) => (
                  <option key={mailDomain.domain} value={mailDomain.domain}>
                    {mailDomain.domain}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            {requireCreatorNote ? (
              <FormField label="用途备注" required>
                <TextInput
                  aria-label="用途备注"
                  name="mailboxCreatorNote"
                  onChange={(event) => setCreatorNote(event.target.value)}
                  placeholder="例如：市场活动回收、客服收件"
                  required
                  type="text"
                  value={creatorNote}
                />
              </FormField>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button onClick={onCloseMailboxComposer} variant="secondary">
                取消
              </Button>
              <Button disabled={!canCreateMailbox} type="submit" variant="primary">
                {isSubmitting ? "创建中…" : "创建邮箱"}
              </Button>
            </div>
          </form>
        </OverlayDialog>
      ) : null}

      {mailboxSelectorOpen ? (
        <OverlayDialog
          className="mailbox-select-dialog"
          closeLabel="关闭邮箱选择"
          onClose={() => setMailboxSelectorOpen(false)}
          size="lg"
          title="选择邮箱"
        >
          <div className="mailbox-select-content">
            <FormField className="mailbox-select-search" label={<span className="sr-only">搜索邮箱</span>}>
              <SearchInput
                autoFocus
                aria-label="搜索邮箱"
                onChange={(event) => setMailboxSearchValue(event.target.value)}
                placeholder="搜索邮箱名或邮箱账号"
                value={mailboxSearchValue}
              />
            </FormField>

            <TableContainer className="mailbox-select-table-shell" density="compact" variant="solid">
              <Table className={canViewMailboxCreator ? "mailbox-select-table is-admin" : "mailbox-select-table"} aria-label="邮箱选择表格">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell align="center" width={56}>序号</TableHeaderCell>
                    <TableHeaderCell width={132}>邮箱标签</TableHeaderCell>
                    <TableHeaderCell width={canViewMailboxCreator ? 300 : 360}>地址</TableHeaderCell>
                    {canViewMailboxCreator ? <TableHeaderCell width={108}>创建人</TableHeaderCell> : null}
                    <TableHeaderCell nowrap width={172}>创建时间</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mailboxSelectorMailboxes.map((mailbox, index) => {
                    const sequence = (safeMailboxPage - 1) * mailboxSelectorPageSize + index + 1;
                    const creatorLabel = mailbox.createdByName || mailbox.createdBy || "-";
                    const createdAtLabel = formatMailboxCreatedAt(mailbox.createdAt);

                    return (
                      <TableRow
                        aria-label={`选择邮箱 ${mailbox.label}`}
                        isInteractive
                        isSelected={mailbox.id === selectedMailboxId}
                        key={mailbox.id}
                        onDoubleClick={() => handleSelectMailbox(mailbox.id)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          handleSelectMailbox(mailbox.id);
                        }}
                        tabIndex={0}
                        title={canViewMailboxCreator
                          ? `${mailbox.label} / ${mailbox.address} / ${creatorLabel} / ${createdAtLabel}`
                          : `${mailbox.label} / ${mailbox.address} / ${createdAtLabel}`}
                      >
                        <TableCell align="center" nowrap>{sequence}</TableCell>
                        <TableCell>
                          <strong className="mailbox-select-table-label" title={mailbox.label}>{mailbox.label}</strong>
                        </TableCell>
                        <TableCell>
                          <span className="mailbox-select-table-address" title={mailbox.address}>{mailbox.address}</span>
                        </TableCell>
                        {canViewMailboxCreator ? (
                          <TableCell>
                            <span className="mailbox-select-table-creator" title={creatorLabel}>{creatorLabel}</span>
                          </TableCell>
                        ) : null}
                        <TableCell nowrap title={createdAtLabel}>{createdAtLabel}</TableCell>
                      </TableRow>
                    );
                  })}
                  {mailboxSelectorError ? (
                    <TableRow>
                      <TableCell colSpan={mailboxSelectorColumnCount}>
                        <p className="error-banner" role="alert">{mailboxSelectorError}</p>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!isLoadingMailboxSelector && !mailboxSelectorError && mailboxSelectorMailboxes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={mailboxSelectorColumnCount}>
                        <p className="empty-state">没有匹配的邮箱。</p>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>

            <Pagination
              aria-label="邮箱选择分页"
              className="mailbox-select-pagination users-list-pagination"
              onChange={setMailboxPage}
              onPageSizeChange={handleMailboxPageSizeChange}
              page={safeMailboxPage}
              pageSize={mailboxSelectorPageSize}
              pageSizeOptions={mailboxPageSizeOptions}
              total={mailboxSelectorTotal}
            />
          </div>
        </OverlayDialog>
      ) : null}
    </>
  );
}
