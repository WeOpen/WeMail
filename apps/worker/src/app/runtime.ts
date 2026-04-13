import type { AppBindings, AppStore, MailboxRecord } from "../core/bindings";
import { resolveAppConfig } from "../core/config";
import { buildExtraction, buildTelegramClient, createPreview, maybeRunAiFallback, parseRawEmail } from "../shared/mail";
import { recordAudit } from "./services/audit-service";
import { defaultFeatureToggles } from "./services/config-service";

function retentionDays(env: AppBindings) {
  return resolveAppConfig(env).message.retentionDays;
}

function attachmentLimit(env: AppBindings) {
  return resolveAppConfig(env).attachments.maxBytes;
}

function totalAttachmentLimit(env: AppBindings) {
  return resolveAppConfig(env).attachments.maxTotalBytes;
}

function aiFallbackLimit(env: AppBindings) {
  return resolveAppConfig(env).ai.fallbackLimit;
}

async function getFeatureToggles(store: AppStore, env: AppBindings) {
  return store.settings.getFeatureToggles(defaultFeatureToggles(env));
}

async function processInboundForMailbox(
  store: AppStore,
  env: AppBindings,
  mailbox: MailboxRecord,
  parsed: {
    fromAddress: string;
    subject: string;
    text: string;
    attachments: Array<{ filename: string; contentType: string; data: Uint8Array; size: number }>;
  }
) {
  let totalAttachmentBytes = 0;
  let oversizeStatus: string | null = null;
  const acceptedAttachments = [];

  for (const attachment of parsed.attachments) {
    totalAttachmentBytes += attachment.size;
    if (attachment.size > attachmentLimit(env) || totalAttachmentBytes > totalAttachmentLimit(env)) {
      oversizeStatus = "rejected_oversize_attachment";
      continue;
    }
    acceptedAttachments.push(attachment);
  }

  let extraction = buildExtraction(parsed.subject, parsed.text);
  const featureToggles = await getFeatureToggles(store, env);
  const aiUsageToday = await store.audit.countByActorSince(
    mailbox.userId,
    "ai-fallback",
    `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
  );

  if (featureToggles.aiEnabled && extraction.type === "none" && aiUsageToday < aiFallbackLimit(env)) {
    extraction = (await maybeRunAiFallback(env, extraction, parsed.text)) as typeof extraction;
    if (extraction.method === "ai") {
      await recordAudit(store, "user", mailbox.userId, "ai-fallback", { mailboxId: mailbox.id });
    }
  }

  const expiresAt = new Date(Date.now() + retentionDays(env) * 24 * 60 * 60 * 1000).toISOString();
  const message = await store.messages.create({
    mailboxId: mailbox.id,
    fromAddress: parsed.fromAddress,
    subject: parsed.subject,
    previewText: createPreview(parsed.text),
    bodyText: parsed.text.slice(0, 10_000),
    extractionJson: JSON.stringify(extraction),
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
    key: `attachments/${mailbox.id}/${message.id}/${attachment.filename}`
  }));

  await store.attachments.createMany(message.id, attachmentRecords);

  if (env.ATTACHMENTS) {
    for (let index = 0; index < acceptedAttachments.length; index += 1) {
      await env.ATTACHMENTS.put(attachmentRecords[index].key, acceptedAttachments[index].data, {
        httpMetadata: { contentType: attachmentRecords[index].contentType }
      });
    }
  }

  const telegram = await store.telegram.findByUserId(mailbox.userId);
  if (telegram?.enabled) {
    const client = buildTelegramClient(resolveAppConfig(env).integrations.telegramBotToken);
    const result = await client?.sendMessage({
      chatId: telegram.chatId,
      text: `New mail for ${mailbox.address}\nFrom: ${parsed.fromAddress}\nSubject: ${parsed.subject}`
    });
    await recordAudit(store, "user", mailbox.userId, "telegram-notify", {
      ok: result?.ok ?? false,
      mailboxId: mailbox.id,
      messageId: message.id
    });
  }

  await recordAudit(store, "user", mailbox.userId, "message-received", {
    mailboxId: mailbox.id,
    messageId: message.id,
    oversizeStatus
  });

  return message;
}

export async function processInboundEmail(
  env: AppBindings,
  store: AppStore,
  message: { to: string; raw: ReadableStream<Uint8Array> }
) {
  const mailbox = await store.mailboxes.findByAddress(message.to);
  if (!mailbox) return null;
  const parsed = await parseRawEmail(message.raw);
  return processInboundForMailbox(store, env, mailbox, parsed);
}

export async function runCleanup(store: AppStore, env: AppBindings) {
  const expired = await store.messages.listExpired(new Date().toISOString());
  const expiredIds = expired.map((entry) => entry.id);
  const attachments = await store.attachments.listByMessageIds(expiredIds);

  if (env.ATTACHMENTS) {
    for (const attachment of attachments) {
      await env.ATTACHMENTS.delete(attachment.key);
    }
  }

  await store.attachments.deleteByMessageIds(expiredIds);
  await store.messages.deleteMany(expiredIds);

  return { deletedMessages: expiredIds.length, deletedAttachments: attachments.length };
}
