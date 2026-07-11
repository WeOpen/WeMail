import type {
  AccountPolicy,
  MailDomainSettings,
  MailboxSummary,
  MessageBatchAction,
  MessageBatchActionResult,
  MessageListQuery,
  MessageListResult,
  MessageSummary,
  OutboundMaturitySummary,
  OutboundListQuery,
  OutboundListResult
} from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";
import type { OutboundHistoryDetail } from "./types";

const MAILBOX_SETUP_CACHE_TTL_MS = 30_000;
const MESSAGE_DETAIL_CACHE_TTL_MS = 30_000;

export type MailboxListQueryInput = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type MailboxListResponse = {
  mailboxes: MailboxSummary[];
  page?: number;
  pageSize?: number;
  total?: number;
};

function buildMailboxListPath(query?: MailboxListQueryInput) {
  if (!query) return "/api/accounts";

  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 10)
  });
  const search = query.search?.trim();
  if (search) params.set("search", search);

  return `/api/accounts?${params.toString()}`;
}

export function fetchMailboxes(query?: MailboxListQueryInput) {
  return apiFetch<MailboxListResponse>(buildMailboxListPath(query));
}

export type MailboxCreatePayload = {
  label: string;
  domain: string;
  creatorNote?: string;
};

export function fetchMailboxDomains() {
  return apiFetch<MailDomainSettings>("/api/accounts/domains", {
    cacheTtlMs: MAILBOX_SETUP_CACHE_TTL_MS
  });
}

export function fetchMailboxPolicy() {
  return apiFetch<{ policy: AccountPolicy }>("/api/accounts/settings", {
    cacheTtlMs: MAILBOX_SETUP_CACHE_TTL_MS
  });
}

export function createMailbox(payload: MailboxCreatePayload) {
  return apiFetch<{ mailbox: MailboxSummary }>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export type MessageListQueryInput = Partial<MessageListQuery> & {
  mailboxId?: string | null;
};

export type MessageListResponse = Partial<MessageListResult> & {
  messages?: MessageSummary[];
};

function normalizeMessageListQuery(query?: MessageListQueryInput | string | null): MessageListQueryInput {
  if (typeof query === "string" || query === null) return { mailboxId: query };
  return query ?? {};
}

export function fetchMessages(query?: MessageListQueryInput | string | null) {
  const normalizedQuery = normalizeMessageListQuery(query);
  const params = new URLSearchParams();
  const search = normalizedQuery.search?.trim();

  if (normalizedQuery.mailboxId) params.set("accountId", normalizedQuery.mailboxId);
  params.set("page", String(normalizedQuery.page ?? 1));
  params.set("pageSize", String(normalizedQuery.pageSize ?? 10));
  params.set("filter", normalizedQuery.filter ?? "all");
  if (search) params.set("search", search);
  if (normalizedQuery.from?.trim()) params.set("from", normalizedQuery.from.trim());
  if (normalizedQuery.subject?.trim()) params.set("subject", normalizedQuery.subject.trim());
  if (normalizedQuery.startDate?.trim()) params.set("startDate", normalizedQuery.startDate.trim());
  if (normalizedQuery.endDate?.trim()) params.set("endDate", normalizedQuery.endDate.trim());
  if (typeof normalizedQuery.hasAttachment === "boolean") params.set("hasAttachment", String(normalizedQuery.hasAttachment));
  if (normalizedQuery.extractionType) params.set("extractionType", normalizedQuery.extractionType);

  return apiFetch<MessageListResponse>(`/api/mail/messages?${params.toString()}`);
}

export function fetchMessageDetail(messageId: string) {
  return apiFetch<{ message: MessageSummary }>(`/api/mail/messages/${encodeURIComponent(messageId)}`, {
    cacheTtlMs: MESSAGE_DETAIL_CACHE_TTL_MS
  });
}

export type MessageBatchPayload = {
  action: MessageBatchAction;
  messageIds: string[];
};

export function batchMessages(payload: MessageBatchPayload) {
  return apiFetch<{ result: MessageBatchActionResult }>("/api/mail/messages/batch", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export type OutboundListQueryInput = Partial<Omit<OutboundListQuery, "mailboxId">> & {
  mailboxId: string;
};

export function fetchOutboundHistory(query: string | OutboundListQueryInput) {
  const normalizedQuery = typeof query === "string" ? { mailboxId: query } : query;
  const params = new URLSearchParams({
    accountId: normalizedQuery.mailboxId,
    page: String(normalizedQuery.page ?? 1),
    pageSize: String(normalizedQuery.pageSize ?? 6),
    status: normalizedQuery.status ?? "all"
  });
  const search = normalizedQuery.search?.trim();
  if (search) params.set("search", search);

  return apiFetch<OutboundListResult>(`/api/mail/outbound?${params.toString()}`);
}

export function fetchOutboundDetail(messageId: string) {
  return apiFetch<{ message: OutboundHistoryDetail }>(`/api/mail/outbound/${encodeURIComponent(messageId)}`);
}

export function fetchOutboundMaturity() {
  return apiFetch<{ maturity: OutboundMaturitySummary }>("/api/mail/outbound/maturity");
}

export function sendOutboundMessage(payload: {
  mailboxId: string;
  toAddress: FormDataEntryValue | null;
  subject: FormDataEntryValue | null;
  bodyText: FormDataEntryValue | null;
}) {
  return apiFetch("/api/mail/send", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
