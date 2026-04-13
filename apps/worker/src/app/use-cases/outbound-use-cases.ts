import type { FeatureToggles } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { buildResendClient } from "../../shared/mail";
import { jsonError, recordAudit } from "../services/audit-service";
import { getOwnedMailbox } from "../services/mailbox-access-service";
import { refreshQuota } from "../services/quota-service";

type OutboundUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "outboundEnabled">;
  env: AppBindings;
};

export async function listOutboundMessages(
  context: OutboundUseCaseContext,
  payload: { userId: string; mailboxId: string }
) {
  const mailbox = await getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);
  return context.store.outboundMessages.listByMailbox(mailbox.id);
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

  const quota = await refreshQuota(context.store, context.env, payload.userId);
  if (quota.disabled || quota.sendsToday >= quota.dailyLimit) {
    return jsonError("Outbound quota exhausted", 403);
  }

  const config = resolveAppConfig(context.env);
  const resend = buildResendClient(config.integrations.resendApiKey);
  if (!resend) return jsonError("Resend not configured", 503);

  const result = await resend.sendEmail({
    from: config.outbound.resendFrom ?? `${config.appName} <no-reply@${config.mailbox.domain}>`,
    to: payload.toAddress,
    subject: payload.subject,
    text: payload.bodyText
  });

  quota.sendsToday += 1;
  quota.updatedAt = new Date().toISOString();
  await context.store.quotas.save(quota);
  await context.store.outboundMessages.create({
    mailboxId: payload.mailboxId,
    toAddress: payload.toAddress,
    subject: payload.subject,
    status: result.success ? "sent" : "failed",
    errorText: result.error ?? null
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
