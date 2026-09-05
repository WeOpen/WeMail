import type { NotificationRuleSummary, NotificationRuleTarget } from "@wemail/shared";

export const WEBHOOK_ENDPOINT_PAGE_SIZE = 5;
export const WEBHOOK_ENDPOINT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
export const WEBHOOK_DELIVERY_PAGE_SIZE = 5;
export const WEBHOOK_DELIVERY_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export type WebhookDeliveryStatus = "all" | "success" | "failed";

export const webhookDeliveryStatusOptions: Array<{ label: string; value: WebhookDeliveryStatus }> = [
  { label: "全部", value: "all" },
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" }
];

export const webhookEventGroups = [
  {
    title: "邮件事件",
    description: "收件、提取和失败都应该第一时间进入你的自动化链路。",
    events: [
      { label: "新邮件到达", value: "message.received" },
      { label: "提取结果完成", value: "message.extracted" },
      { label: "邮件处理失败", value: "message.failed" }
    ]
  },
  {
    title: "通知事件",
    description: "用来观察外部提醒链路是否成功送达。",
    events: [
      { label: "Telegram 发送成功", value: "telegram.sent" },
      { label: "Telegram 发送失败", value: "telegram.failed" }
    ]
  },
  {
    title: "系统事件",
    description: "安全和配置变化适合同步到审计系统。",
    events: [
      { label: "API 密钥创建", value: "api_key.created" },
      { label: "API 密钥吊销", value: "api_key.revoked" },
      { label: "配置变更", value: "settings.updated" }
    ]
  }
] as const;

export const defaultWebhookEvents = webhookEventGroups[0].events.map((event) => event.value);
export const notificationRuleEventOptions = [
  { label: "新邮件到达", value: "message.received" },
  { label: "Webhook 提取结果", value: "message.extracted" },
  { label: "Telegram 提取结果", value: "message.extraction.detected" },
  { label: "邮件处理失败", value: "message.failed" },
  { label: "Telegram 测试", value: "telegram.test" },
  { label: "API 密钥创建", value: "api_key.created" },
  { label: "API 密钥吊销", value: "api_key.revoked" },
  { label: "配置变更", value: "settings.updated" }
];
export const notificationTargetLabels: Record<NotificationRuleTarget, string> = {
  webhook: "Webhook",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  feishu: "飞书",
  wecom: "企业微信"
};

export const sampleHeaders = [
  "content-type: application/json",
  "user-agent: WeMail-Webhook/1.0",
  "x-wemail-event: message.received",
  "x-wemail-delivery-id: whd_01H...",
  "x-wemail-signature: sha256=..."
].join("\n");

export const samplePayload = JSON.stringify(
  {
    createdAt: "2026-04-17T11:30:00.000Z",
    data: {
      message: "WeMail webhook event",
      messageId: "msg_01H...",
      subject: "Your verification code"
    },
    deliveryId: "whd_01H...",
    endpoint: {
      id: "whe_01H...",
      name: "Production Sync"
    },
    eventType: "message.received"
  },
  null,
  2
);

export const signatureVerifyExample = JSON.stringify(
  {
    input: "raw request body + Signing Secret",
    compareWith: "x-wemail-signature",
    note: "Secret stays on your server; the header only contains the sha256 signature."
  },
  null,
  2
);

export const signatureHelpItems = [
  "Signing Secret 只保存在 WeMail 和你的目标服务端，不会明文放进 Header。",
  "WeMail 会用 Secret 对原始请求体计算 HMAC-SHA256，并把结果放到 x-wemail-signature。",
  "目标服务收到请求后，用同一个 Secret 和原始 body 重新计算签名，再与 Header 比对。"
];

export type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  events: string[];
  signingSecret?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WebhookDelivery = {
  id: string;
  endpointId?: string;
  eventType: string;
  status: string;
  statusCode: number | null;
  durationMs: number | null;
  errorText: string | null;
  payload?: unknown;
  responseText?: string | null;
  createdAt: string;
};

export type NotificationRuleDraft = {
  enabled: boolean;
  eventTypes: string[];
  keyword: string;
  mailboxIds: string;
  name: string;
  quietHoursEnd: string;
  quietHoursStart: string;
  target: NotificationRuleTarget;
  targetId: string;
};

export type EndpointDraft = {
  enabled: boolean;
  events: string[];
  name: string;
  url: string;
};

export type OverviewTone = "accent" | "info" | "success" | "warning";

export type WebhookEndpointListPayload = {
  endpoints?: WebhookEndpoint[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export type WebhookDeliveryListPayload = {
  deliveries?: WebhookDelivery[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export type NotificationRuleListPayload = {
  rules?: NotificationRuleSummary[];
};

export const emptyDraft: EndpointDraft = {
  enabled: true,
  events: defaultWebhookEvents,
  name: "",
  url: ""
};

export const emptyNotificationRuleDraft: NotificationRuleDraft = {
  enabled: true,
  eventTypes: ["message.received"],
  keyword: "",
  mailboxIds: "",
  name: "",
  quietHoursEnd: "",
  quietHoursStart: "",
  target: "webhook",
  targetId: ""
};

export function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Webhook 配置同步失败，请稍后重试。";
}

export function formatDate(value?: string) {
  if (!value) return "尚未记录";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function normalizeStatus(status: string) {
  const value = status.toLowerCase();
  if (value === "success" || value === "delivered" || value === "ok") return "成功";
  if (value === "failed" || value === "error") return "失败";
  if (value === "pending" || value === "retrying") return "重试中";
  return status;
}

export function isSuccessfulDelivery(delivery: WebhookDelivery) {
  const value = delivery.status.toLowerCase();
  return value === "success" || value === "delivered" || value === "ok";
}

export function getEventLabel(value: string) {
  for (const group of webhookEventGroups) {
    const match = group.events.find((event) => event.value === value);
    if (match) return match.label;
  }
  return value;
}

export function formatJson(value: unknown) {
  if (typeof value === "undefined") return "{}";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(text);
}


export type WebhookEndpointDialogProps = {
  createDraft: EndpointDraft;
  errorMessage: string | null;
  isCreateDraftValid: boolean;
  isEditingEndpoint: boolean;
  isSaving: boolean;
  onDraftChange: (update: (current: EndpointDraft) => EndpointDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export type WebhookDeliveryDialogProps = {
  copiedToken: string | null;
  delivery: WebhookDelivery;
  isDeliveryLoading: boolean;
  onClose: () => void;
  onCopy: (token: string, text?: string) => void;
  onRetry: (delivery: WebhookDelivery) => void;
};
