import type { MessageListResult, MessageListSummary, MessageSummary } from "@wemail/shared";

import {
  fetchMailboxes,
  fetchMessageDetail,
  fetchMessages,
  fetchOutboundDetail,
  fetchOutboundHistory,
  type MailboxListQueryInput,
  type MailboxListResponse,
  type MessageListQueryInput,
  type OutboundListQueryInput
} from "./api";
import type { OutboundHistoryListResult } from "./types";

const emptyMessageSummary: MessageListSummary = {
  messageCount: 0,
  extractionCount: 0,
  attachmentCount: 0
};

function summarizeMessages(messages: MessageSummary[]): MessageListSummary {
  return {
    messageCount: messages.length,
    extractionCount: messages.filter(
      (message) => message.extraction.type !== "none" && message.extraction.value.trim().length > 0
    ).length,
    attachmentCount: messages.reduce((sum, message) => sum + message.attachmentCount, 0)
  };
}

function resolveQueryPage(query?: MessageListQueryInput | string | null) {
  if (!query || typeof query === "string") return 1;
  return query.page ?? 1;
}

function resolveQueryPageSize(query?: MessageListQueryInput | string | null) {
  if (!query || typeof query === "string") return 10;
  return query.pageSize ?? 10;
}

export async function queryMailboxes() {
  const payload = await fetchMailboxes();
  return payload.mailboxes;
}

export async function queryMailboxOptions(query: MailboxListQueryInput): Promise<Required<MailboxListResponse>> {
  const payload = await fetchMailboxes(query);
  const mailboxes = payload.mailboxes ?? [];

  return {
    mailboxes,
    total: payload.total ?? mailboxes.length,
    page: payload.page ?? query.page ?? 1,
    pageSize: payload.pageSize ?? query.pageSize ?? 10
  };
}

export async function queryMessages(query?: MessageListQueryInput | string | null): Promise<MessageListResult> {
  const payload = await fetchMessages(query);
  const messages = (payload.messages ?? []) as MessageSummary[];
  const summary = payload.summary ?? (messages.length > 0 ? summarizeMessages(messages) : emptyMessageSummary);

  return {
    messages,
    total: payload.total ?? messages.length,
    page: payload.page ?? resolveQueryPage(query),
    pageSize: payload.pageSize ?? resolveQueryPageSize(query),
    summary
  };
}

export async function queryMessageDetail(messageId: string) {
  const payload = await fetchMessageDetail(messageId);
  return payload.message;
}

export async function queryOutboundHistory(query: string | OutboundListQueryInput): Promise<OutboundHistoryListResult> {
  const payload = await fetchOutboundHistory(query);
  const messages = payload.messages ?? [];

  return {
    messages,
    total: payload.total ?? messages.length,
    page: payload.page ?? (typeof query === "string" ? 1 : query.page ?? 1),
    pageSize: payload.pageSize ?? (typeof query === "string" ? 6 : query.pageSize ?? 6),
    summary: payload.summary ?? {
      totalCount: messages.length,
      sentCount: messages.filter((message) => message.status === "sent").length,
      failedCount: messages.filter((message) => message.status === "failed").length
    }
  };
}

export async function queryOutboundDetail(messageId: string) {
  const payload = await fetchOutboundDetail(messageId);
  return payload.message;
}
