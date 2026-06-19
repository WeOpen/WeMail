import type { MailboxSummary, MessageListResult, MessageSummary, MailboxDetail } from "@wemail/shared";

type MailboxRecordLike = {
  id: string;
  address: string;
  label: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
};

type MailboxDetailRecordLike = {
  id: string;
  address: string;
  label: string;
  status: string;
  tags: string[];
  createdBy: string | null;
  createdByName: string | null;
  lastActiveAt: string | null;
  deletedAt: string | null;
  messageCount: number;
  outboundCount: number;
  createdAt: string;
};

type MessageRecordLike = MessageSummary;

export function toMailboxSummary(record: MailboxRecordLike, options?: { includeCreator?: boolean }): MailboxSummary {
  const summary: MailboxSummary = {
    id: record.id,
    address: record.address,
    label: record.label,
    createdAt: record.createdAt
  };

  if (options?.includeCreator) {
    summary.createdBy = record.createdBy ?? null;
    summary.createdByName = record.createdByName ?? null;
  }

  return summary;
}

export function toMailboxDetail(record: MailboxDetailRecordLike): MailboxDetail {
  return {
    id: record.id,
    address: record.address,
    label: record.label,
    status: record.status as MailboxDetail["status"],
    tags: record.tags,
    createdBy: record.createdBy,
    createdByName: record.createdByName,
    lastActiveAt: record.lastActiveAt,
    deletedAt: record.deletedAt,
    messageCount: record.messageCount,
    outboundCount: record.outboundCount,
    createdAt: record.createdAt
  };
}

export function toMailboxListResponse(
  records: MailboxRecordLike[] | { mailboxes: MailboxRecordLike[]; total: number; page: number; pageSize: number },
  options?: { includeCreator?: boolean }
) {
  if (!Array.isArray(records)) {
    return {
      mailboxes: records.mailboxes.map((record) => toMailboxSummary(record, options)),
      total: records.total,
      page: records.page,
      pageSize: records.pageSize
    };
  }

  return {
    mailboxes: records.map((record) => toMailboxSummary(record, options))
  };
}

export function toMailboxDetailListResponse(result: { accounts: MailboxDetailRecordLike[]; total: number }) {
  return {
    accounts: result.accounts.map(toMailboxDetail),
    total: result.total
  };
}

export function toMailboxCreateResponse(record: MailboxRecordLike) {
  return {
    mailbox: toMailboxSummary(record)
  };
}

export function toMessageListResponse(result: MessageRecordLike[] | MessageListResult) {
  if (Array.isArray(result)) return { messages: result };
  return result;
}

export function toMessageDetailResponse(message: MessageRecordLike) {
  return { message };
}
