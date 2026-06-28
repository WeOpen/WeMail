import { batchMessages, createMailbox as createMailboxRequest, sendOutboundMessage } from "./api";
import type { MailboxCreatePayload, MessageBatchPayload } from "./api";

export async function createMailboxAction(payload: MailboxCreatePayload) {
  return createMailboxRequest(payload);
}

export async function sendOutboundAction(payload: {
  mailboxId: string;
  toAddress: FormDataEntryValue | null;
  subject: FormDataEntryValue | null;
  bodyText: FormDataEntryValue | null;
}) {
  return sendOutboundMessage(payload);
}

export async function batchMessagesAction(payload: MessageBatchPayload) {
  return batchMessages(payload);
}
