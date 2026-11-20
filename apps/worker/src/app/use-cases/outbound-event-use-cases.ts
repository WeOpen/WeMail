import type { OutboundMessageStatus } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { readProviderBody } from "../../shared/provider-response";
import { verifyResendWebhook } from "../../shared/resend-webhook";
import { jsonError } from "../services/audit-service";

const statuses: Record<string, OutboundMessageStatus> = {
  "email.sent": "accepted", "email.delivered": "delivered", "email.bounced": "bounced",
  "email.complained": "complained", "email.failed": "failed", "email.delivery_delayed": "accepted"
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function receiveOutboundProviderEvent(store: AppStore, env: AppBindings, request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) return jsonError("Provider webhook is not configured", 503);
  const raw = await readProviderBody(request, 256_001);
  if (new TextEncoder().encode(raw).byteLength > 256_000) return jsonError("Provider event is too large", 413);
  if (!await verifyResendWebhook(raw, request.headers, env.RESEND_WEBHOOK_SECRET)) return jsonError("Invalid provider signature", 401);
  let payload: Record<string, unknown> | null;
  try { payload = asRecord(JSON.parse(raw)); } catch { return jsonError("Invalid provider JSON", 400); }
  if (!payload || typeof payload.type !== "string" || !payload.type || payload.type.length > 128) return jsonError("Invalid provider event", 400);
  const type = payload.type;
  if (!Object.hasOwn(statuses, type)) return { received: true, ignored: true };
  const data = asRecord(payload.data);
  const providerMessageId = data?.email_id;
  const occurredAt = new Date(typeof payload.created_at === "string" ? payload.created_at : "");
  const detail = asRecord(data?.bounce)?.message ?? asRecord(data?.failed)?.reason;
  if (typeof providerMessageId !== "string" || !providerMessageId || providerMessageId.length > 256 || !Number.isFinite(occurredAt.getTime()) || (detail != null && typeof detail !== "string")) return jsonError("Invalid provider event", 400);
  await store.outboundSends.recordProviderEvent({
    id: request.headers.get("svix-id")!, providerMessageId, type, status: statuses[type], occurredAt: occurredAt.toISOString(),
    detail: typeof detail === "string" ? detail.slice(0, 2000) : type === "email.delivery_delayed" ? "供应商暂时无法投递，正在继续尝试" : null
  });
  return { received: true };
}
