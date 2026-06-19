import { parseMailSettingsRecord, type FeatureToggles, type OutboundListStatus, type UserRole } from "@wemail/shared";

import type { AppBindings, AppStore, ResendClient } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { buildResendClient } from "../../shared/mail";
import { jsonError, recordAudit } from "../services/audit-service";
import { getApiDailyLimit, getMailDomains, getOutboundLimit } from "../services/config-service";
import { getOwnedMailbox } from "../services/mailbox-access-service";

type OutboundUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "outboundEnabled">;
  env: AppBindings;
};

type ResendEmailPayload = Parameters<ResendClient["sendEmail"]>[0];

function parseRetryAttemptCount(value: string) {
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Math.max(0, Number.parseInt(match[0], 10));
}

function appendSignature(bodyText: string, signature: string) {
  const normalizedSignature = signature.trim();
  if (!normalizedSignature) return bodyText;

  const normalizedBodyText = bodyText.trimEnd();
  if (!normalizedBodyText) return normalizedSignature;
  return `${normalizedBodyText}\n\n${normalizedSignature}`;
}

async function sendEmailWithRetries(resend: ResendClient, payload: ResendEmailPayload, retryCount: number) {
  let lastResult: Awaited<ReturnType<ResendClient["sendEmail"]>> | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    lastResult = await resend.sendEmail(payload);
    if (lastResult.success) return lastResult;
  }

  return lastResult ?? { success: false, error: "Failed to send" };
}

async function getVisibleMailbox(
  context: OutboundUseCaseContext,
  payload: { userId: string; userRole: UserRole; mailboxId: string }
) {
  if (payload.userRole === "admin") return context.store.mailboxes.findById(payload.mailboxId);
  return getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
}

function stringifyProviderResponse(result: Awaited<ReturnType<ResendClient["sendEmail"]>>) {
  if (!result.success) return JSON.stringify({ error: result.error ?? "Failed to send" });
  return JSON.stringify(result.responsePayload ?? { id: result.messageId ?? null });
}

export async function listOutboundMessages(
  context: OutboundUseCaseContext,
  payload: {
    userId: string;
    userRole: UserRole;
    mailboxId: string;
    page: number;
    pageSize: number;
    search?: string;
    status?: OutboundListStatus;
  }
) {
  const mailbox = await getVisibleMailbox(context, payload);
  if (!mailbox) return jsonError("Mailbox not found", 404);
  return context.store.outboundMessages.listByMailbox({
    mailboxId: mailbox.id,
    page: payload.page,
    pageSize: payload.pageSize,
    status: payload.status ?? "all",
    ...(payload.search ? { search: payload.search } : {})
  });
}

export async function getOutboundMessageDetail(
  context: OutboundUseCaseContext,
  payload: { userId: string; userRole: UserRole; messageId: string }
) {
  const message = await context.store.outboundMessages.findById(payload.messageId);
  if (!message) return jsonError("Outbound message not found", 404);

  const mailbox = await getVisibleMailbox(context, {
    userId: payload.userId,
    userRole: payload.userRole,
    mailboxId: message.mailboxId
  });
  if (!mailbox) return jsonError("Outbound message not found", 404);

  return message;
}

export async function sendOutboundMessageUseCase(
  context: OutboundUseCaseContext,
  payload: { userId: string; mailboxId: string; toAddress: string; subject: string; bodyText: string }
) {
  if (!context.featureToggles.outboundEnabled) {
    return jsonError("Outbound sending disabled", 403);
  }

  const mailbox = await getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);

  const config = resolveAppConfig(context.env);
  const [primaryDomain] = await getMailDomains(context.store, context.env);
  const resend = buildResendClient(config.integrations.resendApiKey);
  if (!resend) return jsonError("Resend not configured", 503);
  const quota = await context.store.quotas.consumeOutboundSend(
    payload.userId,
    getOutboundLimit(context.env),
    getApiDailyLimit(context.env)
  );
  if (!quota) return jsonError("Outbound quota exhausted", 403);
  const mailSettings = parseMailSettingsRecord(await context.store.mailSettings.get());
  const fallbackSenderIdentity = config.outbound.resendFrom ?? `${config.appName} <no-reply@${primaryDomain.domain}>`;
  const senderIdentity = mailSettings.senderRules.defaultIdentity.trim() || fallbackSenderIdentity;
  const text = appendSignature(payload.bodyText, mailSettings.senderRules.signature);
  const retryCount = mailSettings.senderRules.retryEnabled ? parseRetryAttemptCount(mailSettings.senderRules.retryAttempts) : 0;

  const resendPayload = {
    from: senderIdentity,
    to: payload.toAddress,
    subject: payload.subject,
    text
  };
  const result = await sendEmailWithRetries(resend, resendPayload, retryCount);

  await context.store.outboundMessages.create({
    mailboxId: payload.mailboxId,
    fromAddress: senderIdentity,
    toAddress: payload.toAddress,
    subject: payload.subject,
    bodyText: payload.bodyText,
    status: result.success ? "sent" : "failed",
    errorText: result.error ?? null,
    providerMessageId: result.messageId ?? null,
    requestPayloadJson: JSON.stringify(resendPayload),
    responsePayloadJson: stringifyProviderResponse(result)
  });
  await recordAudit(context.store, "user", payload.userId, "outbound-send", {
    mailboxId: payload.mailboxId,
    ok: result.success
  });

  if (!result.success) return jsonError(result.error ?? "Failed to send", 502);
  return {
    dailyLimit: quota.dailyLimit,
    sendsToday: quota.sendsToday,
    disabled: quota.disabled
  };
}
