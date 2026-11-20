import type { NotificationDeliverySummary, NotificationRuleEvaluation, NotificationRuleTarget, NotificationStatusSummary } from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";

export type NotificationStatusPayload = { summary: NotificationStatusSummary; deliveries: NotificationDeliverySummary[] };

export function fetchNotificationStatus(options: { admin?: boolean; target?: NotificationRuleTarget; signal?: AbortSignal }) {
  const path = options.admin ? "/api/system/notification-status" : `/api/notification/deliveries${options.target ? `?target=${options.target}` : ""}`;
  return apiFetch<NotificationStatusPayload>(path, { signal: options.signal, dedupe: false });
}

export function retryNotificationDelivery(id: string) {
  return apiFetch<NotificationStatusPayload>(`/api/notification/deliveries/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

export function evaluateNotificationSample(input: { target: NotificationRuleTarget; eventType: string; targetId?: string; data: Record<string, unknown> }) {
  return apiFetch<NotificationRuleEvaluation>("/api/notification/rules/test", { method: "POST", body: JSON.stringify(input) });
}
