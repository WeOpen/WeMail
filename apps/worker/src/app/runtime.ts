import { parseAccountPolicyRecord } from "@wemail/shared";

import type { AppBindings, AppStore, MailboxRecord, PersistedMessageRecord } from "../core/bindings";
import { buildExtraction, createPreview, maybeRunAiFallback, parseRawEmail } from "../shared/mail";
import { recordAudit } from "./services/audit-service";
import { defaultFeatureToggles } from "./services/config-service";
import { getRuntimeSettings } from "./services/runtime-settings-service";
import { sendTelegramNotification } from "./services/telegram-service";
import { sendWebhookEventToUser } from "./services/webhook-service";

function normalizeRecipientAddress(address: string) {
  return address.trim().toLowerCase();
}

const INBOUND_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

function buildUnmatchedMailboxId(address: string) {
  return `unmatched:${normalizeRecipientAddress(address)}`;
}

async function getFeatureToggles(store: AppStore, env: AppBindings) {
  return store.settings.getFeatureToggles(defaultFeatureToggles(env));
}

function collectAcceptedAttachments(
  settings: Awaited<ReturnType<typeof getRuntimeSettings>>,
  attachments: Array<{ filename: string; contentType: string; data: Uint8Array; size: number }>
) {
  let totalAttachmentBytes = 0;
  let oversizeStatus: string | null = null;
  const acceptedAttachments: Array<{ filename: string; contentType: string; data: Uint8Array; size: number }> = [];

  for (const attachment of attachments) {
    totalAttachmentBytes += attachment.size;
    if (
      attachment.size > settings.attachments.maxBytes ||
      totalAttachmentBytes > settings.attachments.maxTotalBytes
    ) {
      oversizeStatus = "rejected_oversize_attachment";
      continue;
    }
    acceptedAttachments.push(attachment);
  }

  return { acceptedAttachments, oversizeStatus };
}

function isRecentDuplicateMessage(
  message: PersistedMessageRecord,
  input: {
    toAddress: string;
    fromAddress: string;
    subject: string;
    previewText: string;
    bodyText: string;
  }
) {
  const receivedAt = new Date(message.receivedAt).getTime();
  if (!Number.isFinite(receivedAt) || Date.now() - receivedAt > INBOUND_DUPLICATE_WINDOW_MS) return false;

  return (
    normalizeRecipientAddress(message.toAddress ?? "") === normalizeRecipientAddress(input.toAddress) &&
    message.fromAddress.toLowerCase() === input.fromAddress.toLowerCase() &&
    message.subject === input.subject &&
    message.previewText === input.previewText &&
    message.bodyText === input.bodyText
  );
}

async function findRecentDuplicateMessage(
  store: AppStore,
  input: {
    mailboxId: string;
    toAddress: string;
    parsed: {
      fromAddress: string;
      subject: string;
      text: string;
    };
  }
) {
  const previewText = createPreview(input.parsed.text);
  const bodyText = input.parsed.text.slice(0, 10_000);
  const messages = await store.messages.listByMailbox(input.mailboxId);
  return messages.find((message) =>
    isRecentDuplicateMessage(message, {
      toAddress: input.toAddress,
      fromAddress: input.parsed.fromAddress,
      subject: input.parsed.subject,
      previewText,
      bodyText
    })
  );
}

async function saveInboundMessage(
  store: AppStore,
  env: AppBindings,
  input: {
    mailboxId: string;
    toAddress: string;
    parsed: {
      fromAddress: string;
      subject: string;
      text: string;
      attachments: Array<{ filename: string; contentType: string; data: Uint8Array; size: number }>;
    };
    extraction: ReturnType<typeof buildExtraction>;
  }
) {
  const duplicate = await findRecentDuplicateMessage(store, input);
  if (duplicate) return { message: duplicate, oversizeStatus: duplicate.oversizeStatus, duplicateSuppressed: true };

  const settings = await getRuntimeSettings(store, env);
  const { acceptedAttachments, oversizeStatus } = collectAcceptedAttachments(settings, input.parsed.attachments);
  const expiresAt = new Date(Date.now() + settings.message.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const message = await store.messages.create({
    mailboxId: input.mailboxId,
    toAddress: input.toAddress,
    fromAddress: input.parsed.fromAddress,
    subject: input.parsed.subject,
    previewText: createPreview(input.parsed.text),
    bodyText: input.parsed.text.slice(0, 10_000),
    extractionJson: JSON.stringify(input.extraction),
    oversizeStatus,
    attachmentCount: acceptedAttachments.length,
    receivedAt: new Date().toISOString(),
    expiresAt
  });

  const attachmentRecords = acceptedAttachments.map((attachment) => ({
    id: crypto.randomUUID(),
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    key: `attachments/${input.mailboxId}/${message.id}/${attachment.filename}`
  }));

  await store.attachments.createMany(message.id, attachmentRecords);

  if (env.ATTACHMENTS) {
    for (let index = 0; index < acceptedAttachments.length; index += 1) {
      await env.ATTACHMENTS.put(attachmentRecords[index].key, acceptedAttachments[index].data, {
        httpMetadata: { contentType: attachmentRecords[index].contentType }
      });
    }
  }

  return { message, oversizeStatus, duplicateSuppressed: false };
}

async function processInboundForMailbox(
  store: AppStore,
  env: AppBindings,
  mailbox: MailboxRecord,
  toAddress: string,
  parsed: {
    fromAddress: string;
    subject: string;
    text: string;
    attachments: Array<{ filename: string; contentType: string; data: Uint8Array; size: number }>;
  }
) {
  let extraction = buildExtraction(parsed.subject, parsed.text);
  const featureToggles = await getFeatureToggles(store, env);
  const settings = await getRuntimeSettings(store, env);
  const aiUsageToday = await store.audit.countByActorSince(
    mailbox.userId,
    "ai-fallback",
    `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
  );

  if (featureToggles.aiEnabled && extraction.type === "none" && aiUsageToday < settings.ai.fallbackLimit) {
    extraction = (await maybeRunAiFallback(env, extraction, parsed.text)) as typeof extraction;
    if (extraction.method === "ai") {
      await recordAudit(store, "user", mailbox.userId, "ai-fallback", { mailboxId: mailbox.id });
    }
  }

  const { message, oversizeStatus, duplicateSuppressed } = await saveInboundMessage(store, env, {
    mailboxId: mailbox.id,
    toAddress,
    parsed,
    extraction
  });

  if (duplicateSuppressed) {
    await recordAudit(store, "user", mailbox.userId, "message-duplicate-suppressed", {
      mailboxId: mailbox.id,
      messageId: message.id
    });
    return message;
  }

  await sendTelegramNotification(
    { store, env, featureToggles },
    {
      userId: mailbox.userId,
      eventId: "message.received",
      text: `New mail for ${mailbox.address}\nFrom: ${parsed.fromAddress}\nSubject: ${parsed.subject}`,
      metadata: { mailboxId: mailbox.id, messageId: message.id }
    }
  );
  await sendWebhookEventToUser(store, mailbox.userId, "message.received", {
    mailboxAddress: mailbox.address,
    mailboxId: mailbox.id,
    messageId: message.id,
    fromAddress: parsed.fromAddress,
    subject: parsed.subject
  });

  if (extraction.type !== "none") {
    await sendTelegramNotification(
      { store, env, featureToggles },
      {
        userId: mailbox.userId,
        eventId: "message.extraction.detected",
        text: `Extracted result for ${mailbox.address}\n${extraction.label}: ${extraction.value}\nSubject: ${parsed.subject}`,
        metadata: { mailboxId: mailbox.id, messageId: message.id, extractionType: extraction.type }
      }
    );
    await sendWebhookEventToUser(store, mailbox.userId, "message.extracted", {
      mailboxAddress: mailbox.address,
      mailboxId: mailbox.id,
      messageId: message.id,
      extraction
    });
  }

  await recordAudit(store, "user", mailbox.userId, "message-received", {
    mailboxId: mailbox.id,
    messageId: message.id,
    oversizeStatus
  });
  await store.mailboxes.update(mailbox.id, { lastActiveAt: message.receivedAt });

  return message;
}

export async function processInboundEmail(
  env: AppBindings,
  store: AppStore,
  message: { to: string; raw: ReadableStream<Uint8Array> }
) {
  const toAddress = normalizeRecipientAddress(message.to);
  const parsed = await parseRawEmail(message.raw);
  const mailbox = await store.mailboxes.findByAddress(toAddress);
  if (!mailbox) {
    const { message: unmatchedMessage } = await saveInboundMessage(store, env, {
      mailboxId: buildUnmatchedMailboxId(toAddress),
      toAddress,
      parsed,
      extraction: buildExtraction(parsed.subject, parsed.text)
    });
    return unmatchedMessage;
  }
  return processInboundForMailbox(store, env, mailbox, toAddress, parsed);
}

export async function runCleanup(store: AppStore, env: AppBindings) {
  const startedAt = new Date().toISOString();

  try {
    const expired = await store.messages.listExpired(new Date().toISOString());
    const expiredIds = expired.map((entry) => entry.id);
    const attachments = await store.attachments.listByMessageIds(expiredIds);
    const accountPolicy = parseAccountPolicyRecord(await store.accountSettings.get());
    let deletedAccounts = 0;

    if (env.ATTACHMENTS) {
      for (const attachment of attachments) {
        await env.ATTACHMENTS.delete(attachment.key);
      }
    }

    await store.attachments.deleteByMessageIds(expiredIds);
    await store.messages.deleteMany(expiredIds);

    if (accountPolicy.lifecycle.allowHardDelete) {
      const cutoff = new Date(
        Date.now() - accountPolicy.lifecycle.softDeleteRetentionDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const expiredAccountIds: string[] = [];
      const pageSize = 500;
      let page = 1;
      let total = 0;

      do {
        const result = await store.mailboxes.listAllWithDetails({
          page,
          pageSize,
          status: "soft_deleted"
        });
        total = result.total;

        for (const account of result.accounts) {
          if (account.deletedAt && account.deletedAt <= cutoff) {
            expiredAccountIds.push(account.id);
          }
        }

        page += 1;
      } while ((page - 1) * pageSize < total);

      for (const accountId of expiredAccountIds) {
        await store.mailboxes.delete(accountId);
      }
      deletedAccounts = expiredAccountIds.length;
    }

    const result = { deletedMessages: expiredIds.length, deletedAttachments: attachments.length, deletedAccounts };
    await store.cleanupRuns.record({
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      ...result,
      errorText: null
    });
    return result;
  } catch (error) {
    await store.cleanupRuns.record({
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      deletedMessages: 0,
      deletedAttachments: 0,
      deletedAccounts: 0,
      errorText: error instanceof Error ? error.message : "Cleanup failed"
    });
    throw error;
  }
}
