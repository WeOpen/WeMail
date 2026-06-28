import type {
  ExtractionType,
  MessageBatchAction,
  MessageBatchActionResult,
  MessageFilter,
  MessageListResult,
  UserRole
} from "@wemail/shared";

import type { AttachmentRecord, AppStore, PersistedMessageRecord } from "../../core/bindings";
import { toMessageJson } from "../../shared/mail";
import { jsonError, recordAudit } from "../services/audit-service";
import { getOwnedMailbox } from "../services/mailbox-access-service";

type MessageUseCaseContext = {
  store: AppStore;
};

function isUnmatchedMailboxId(mailboxId: string) {
  return mailboxId.startsWith("unmatched:");
}

async function getVisibleMessage(
  context: MessageUseCaseContext,
  payload: { userId: string; userRole: UserRole; messageId: string }
) {
  const message = await context.store.messages.findById(payload.messageId);
  if (!message) return null;

  if (payload.userRole === "admin" && isUnmatchedMailboxId(message.mailboxId)) {
    return { mailbox: null, message };
  }

  const mailbox = await context.store.mailboxes.findById(message.mailboxId);
  if (!mailbox) return null;
  if (payload.userRole !== "admin" && mailbox.userId !== payload.userId) return null;

  return { mailbox, message };
}

async function buildMessageSummary(
  context: MessageUseCaseContext,
  message: PersistedMessageRecord
) {
  return toMessageJson(message, await context.store.attachments.listByMessage(message.id));
}

async function listOwnedMailboxIds(
  context: MessageUseCaseContext,
  payload: { userId: string; userRole: UserRole; mailboxId?: string | null }
) {
  if (payload.mailboxId) {
    if (payload.userRole === "admin") {
      const mailbox = await context.store.mailboxes.findById(payload.mailboxId);
      if (!mailbox) return jsonError("Mailbox not found", 404);
      return { includeUnmatched: false, mailboxIds: [mailbox.id] };
    }

    const mailbox = await getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
    if (!mailbox) return jsonError("Mailbox not found", 404);
    return { includeUnmatched: false, mailboxIds: [mailbox.id] };
  }

  if (payload.userRole === "admin") {
    const mailboxIds: string[] = [];
    const pageSize = 500;
    let page = 1;
    let total = 0;

    do {
      const result = await context.store.mailboxes.listAllWithDetails({
        page,
        pageSize,
        status: "enabled"
      });
      total = result.total;
      mailboxIds.push(...result.accounts.map((mailbox) => mailbox.id));
      page += 1;
    } while ((page - 1) * pageSize < total);

    return { includeUnmatched: true, mailboxIds };
  }

  const mailboxes = await context.store.mailboxes.listByUser(payload.userId);
  return { includeUnmatched: false, mailboxIds: mailboxes.map((mailbox) => mailbox.id) };
}

export async function listMessagesUseCase(
  context: MessageUseCaseContext,
  payload: {
    userId: string;
    userRole: UserRole;
    mailboxId?: string | null;
    page: number;
    pageSize: number;
    search?: string;
    filter?: MessageFilter;
    from?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    hasAttachment?: boolean;
    extractionType?: ExtractionType;
  }
): Promise<MessageListResult | Response> {
  const mailboxIds = await listOwnedMailboxIds(context, payload);
  if (mailboxIds instanceof Response) return mailboxIds;
  const result = await context.store.messages.listForMailboxes({
    mailboxIds: mailboxIds.mailboxIds,
    includeUnmatched: mailboxIds.includeUnmatched,
    page: payload.page,
    pageSize: payload.pageSize,
    filter: payload.filter ?? "all",
    ...(payload.search ? { search: payload.search } : {}),
    ...(payload.from ? { from: payload.from } : {}),
    ...(payload.subject ? { subject: payload.subject } : {}),
    ...(payload.startDate ? { startDate: payload.startDate } : {}),
    ...(payload.endDate ? { endDate: payload.endDate } : {}),
    ...(typeof payload.hasAttachment === "boolean" ? { hasAttachment: payload.hasAttachment } : {}),
    ...(payload.extractionType ? { extractionType: payload.extractionType } : {})
  });
  const messages = await Promise.all(result.messages.map((message) => buildMessageSummary(context, message)));

  return {
    ...result,
    messages
  };
}

export async function listMailboxMessagesUseCase(
  context: MessageUseCaseContext,
  payload: { userId: string; mailboxId: string }
) {
  const mailbox = await getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);

  const messages = await context.store.messages.listByMailbox(mailbox.id);
  return Promise.all(messages.map((message) => buildMessageSummary(context, message)));
}

export async function listUserMessagesUseCase(
  context: MessageUseCaseContext,
  payload: { userId: string }
) {
  const mailboxes = await context.store.mailboxes.listByUser(payload.userId);
  const messageGroups = await Promise.all(
    mailboxes.map((mailbox) => context.store.messages.listByMailbox(mailbox.id))
  );
  const messages = messageGroups.flat().sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  return Promise.all(messages.map((message) => buildMessageSummary(context, message)));
}

export async function getMessageDetailUseCase(
  context: MessageUseCaseContext,
  payload: { userId: string; userRole: UserRole; messageId: string }
) {
  const owned = await getVisibleMessage(context, payload);
  if (!owned) return jsonError("Message not found", 404);

  return buildMessageSummary(context, owned.message);
}

export async function getMessageAttachmentUseCase(
  context: MessageUseCaseContext,
  payload: { userId: string; userRole: UserRole; messageId: string; attachmentId: string }
) {
  const owned = await getVisibleMessage(context, payload);
  if (!owned) return jsonError("Message not found", 404);

  const attachment = (await context.store.attachments.listByMessage(owned.message.id)).find(
    (entry) => entry.id === payload.attachmentId
  );
  if (!attachment) return jsonError("Attachment not found", 404);

  return { message: owned.message, attachment } satisfies {
    message: PersistedMessageRecord;
    attachment: AttachmentRecord;
  };
}

export async function runMessageBatchActionUseCase(
  context: MessageUseCaseContext,
  payload: {
    userId: string;
    userRole: UserRole;
    action: MessageBatchAction;
    messageIds: string[];
  }
): Promise<MessageBatchActionResult> {
  const requestedIds = Array.from(new Set(payload.messageIds.map((messageId) => messageId.trim()).filter(Boolean)));
  const visibleMessages = (
    await Promise.all(
      requestedIds.map((messageId) =>
        getVisibleMessage(context, {
          userId: payload.userId,
          userRole: payload.userRole,
          messageId
        })
      )
    )
  ).filter((entry): entry is NonNullable<Awaited<ReturnType<typeof getVisibleMessage>>> => Boolean(entry));
  const visibleMessageIds = visibleMessages.map((entry) => entry.message.id);

  if (payload.action === "export") {
    const messages = await Promise.all(visibleMessages.map((entry) => buildMessageSummary(context, entry.message)));
    await recordAudit(context.store, "user", payload.userId, "message-batch-export", {
      requested: requestedIds.length,
      exported: messages.length
    });

    return {
      action: payload.action,
      affected: messages.length,
      requested: requestedIds.length,
      messages
    };
  }

  await context.store.attachments.deleteByMessageIds(visibleMessageIds);
  await context.store.messages.deleteMany(visibleMessageIds);
  await recordAudit(context.store, "user", payload.userId, "message-batch-delete", {
    requested: requestedIds.length,
    deleted: visibleMessageIds.length
  });

  return {
    action: payload.action,
    affected: visibleMessageIds.length,
    requested: requestedIds.length
  };
}
