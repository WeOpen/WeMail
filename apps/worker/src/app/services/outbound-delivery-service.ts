import { parseMailSettingsRecord } from "@wemail/shared";

import type { AppBindings, AppStore, OutboundSendRecord } from "../../core/bindings";
import { buildResendClient } from "../../shared/mail";
import { defaultFeatureToggles } from "./config-service";

async function deliver(store: AppStore, env: AppBindings, task: OutboundSendRecord, now: Date) {
  if (!task.leaseToken) throw new Error("Outbound lease is required");
  const started = Date.now();
  const finishTime = () => new Date(now.getTime() + Math.max(0, Date.now() - started));
  const completeUnavailable = (errorText: string) => store.outboundSends.complete(task.id, {
    leaseToken: task.leaseToken!, status: task.submissionUncertain ? "uncertain" : "failed", errorText, nowIso: finishTime().toISOString()
  });
  const [user, mailbox, features] = await Promise.all([
    store.users.findById(task.userId), store.mailboxes.findById(task.mailboxId), store.settings.getFeatureToggles(defaultFeatureToggles(env))
  ]);
  if (!user || user.status !== "active" || !mailbox || mailbox.userId !== task.userId || !features.outboundEnabled) {
    await completeUnavailable("用户、邮箱或发件功能已停用");
    return;
  }
  const client = buildResendClient(env.RESEND_API_KEY);
  if (!client) { await completeUnavailable("Resend 未配置"); return; }
  let payload: Parameters<typeof client.sendEmail>[0];
  try { payload = JSON.parse(task.requestPayloadJson); } catch {
    await completeUnavailable("已保存的发送请求无法读取");
    return;
  }
  const result = await client.sendEmail({ ...payload, idempotencyKey: `wemail-send/${task.id}` });
  const completed = finishTime();
  // A failed local commit must leave the lease recoverable: the provider may
  // already have accepted this request. Never turn a storage error into failure.
  if (result.success) {
    await store.outboundSends.complete(task.id, {
      leaseToken: task.leaseToken, status: "accepted", providerMessageId: result.messageId,
      responsePayloadJson: JSON.stringify(result.responsePayload), nowIso: completed.toISOString()
    });
    return;
  }
  const isAmbiguous = result.statusCode == null || result.statusCode === 408 || result.statusCode >= 500 || (result.statusCode >= 200 && result.statusCode < 300) || result.errorCode === "concurrent_idempotent_requests";
  const submissionUncertain = task.submissionUncertain || isAmbiguous;
  const canRetry = isAmbiguous || result.statusCode === 408 || result.statusCode === 429 || (result.statusCode ?? 0) >= 500;
  const retry = canRetry && task.attempts < task.maxAttempts;
  const delay = Math.max(task.retryDelayMs, Math.min(result.retryAfterMs ?? 0, 3_600_000));
  await store.outboundSends.complete(task.id, {
    leaseToken: task.leaseToken, status: retry ? "queued" : submissionUncertain ? "uncertain" : "failed", submissionUncertain,
    errorText: result.error ?? "供应商拒绝发送", responsePayloadJson: JSON.stringify(result.responsePayload ?? { error: result.error ?? "供应商拒绝发送" }),
    ...(retry ? { nextAttemptAt: new Date(completed.getTime() + delay).toISOString() } : {}), nowIso: completed.toISOString()
  });
}

export async function processOutboundSends(store: AppStore, env: AppBindings, options: { now?: Date; id?: string; userId?: string; limit?: number } = {}) {
  const now = options.now ?? new Date();
  const tasks = await store.outboundSends.claimDue({ nowIso: now.toISOString(), lockBeforeIso: new Date(now.getTime() - 120_000).toISOString(), limit: options.limit ?? 10, id: options.id, userId: options.userId });
  const start = Date.now();
  const failures: unknown[] = [];
  for (let offset = 0; offset < tasks.length; offset += 4) {
    // Finish the bounded batch even when one database write fails; any failed
    // lease remains available for recovery with the same provider request key.
    const results = await Promise.allSettled(tasks.slice(offset, offset + 4).map((task) => deliver(store, env, task, new Date(now.getTime() + Math.max(0, Date.now() - start)))));
    const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failed) failures.push(failed.reason);
  }
  if (failures.length) throw failures[0];
  return { claimed: tasks.length };
}

export async function cleanupOutboundPayloads(store: AppStore, now = new Date()) {
  const settings = parseMailSettingsRecord(await store.mailSettings.get());
  const days = Number.parseInt(settings.senderRules.failureRetention, 10) || 30;
  await store.outboundSends.cleanup(new Date(now.getTime() - days * 86_400_000).toISOString());
}
