import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  Eye,
  Pencil,
  Link2,
  ListChecks,
  Plus,
  RadioTower,
  RefreshCw,
  RotateCw,
  Trash2,
  Webhook as WebhookIcon,
  XCircle,
  type LucideIcon
} from "lucide-react";

import type { NotificationRuleSummary, NotificationRuleTarget } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import { Button } from "../../shared/button";
import { apiFetch } from "../../shared/api/client";
import { CheckboxField, FormField, SelectInput, TextInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { Pagination } from "../../shared/pagination";

const WEBHOOK_ENDPOINT_PAGE_SIZE = 5;
const WEBHOOK_ENDPOINT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const WEBHOOK_DELIVERY_PAGE_SIZE = 5;
const WEBHOOK_DELIVERY_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

type WebhookDeliveryStatus = "all" | "success" | "failed";

const webhookDeliveryStatusOptions: Array<{ label: string; value: WebhookDeliveryStatus }> = [
  { label: "全部", value: "all" },
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" }
];

const webhookEventGroups = [
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

const defaultWebhookEvents = webhookEventGroups[0].events.map((event) => event.value);
const notificationRuleEventOptions = [
  { label: "新邮件到达", value: "message.received" },
  { label: "Webhook 提取结果", value: "message.extracted" },
  { label: "Telegram 提取结果", value: "message.extraction.detected" },
  { label: "邮件处理失败", value: "message.failed" },
  { label: "Telegram 测试", value: "telegram.test" },
  { label: "API 密钥创建", value: "api_key.created" },
  { label: "API 密钥吊销", value: "api_key.revoked" },
  { label: "配置变更", value: "settings.updated" }
];
const notificationTargetLabels: Record<NotificationRuleTarget, string> = {
  webhook: "Webhook",
  telegram: "Telegram",
  slack: "Slack",
  discord: "Discord",
  feishu: "飞书",
  wecom: "企业微信"
};

const sampleHeaders = [
  "content-type: application/json",
  "user-agent: WeMail-Webhook/1.0",
  "x-wemail-event: message.received",
  "x-wemail-delivery-id: whd_01H...",
  "x-wemail-signature: sha256=..."
].join("\n");

const samplePayload = JSON.stringify(
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

const signatureVerifyExample = JSON.stringify(
  {
    input: "raw request body + Signing Secret",
    compareWith: "x-wemail-signature",
    note: "Secret stays on your server; the header only contains the sha256 signature."
  },
  null,
  2
);

const signatureHelpItems = [
  "Signing Secret 只保存在 WeMail 和你的目标服务端，不会明文放进 Header。",
  "WeMail 会用 Secret 对原始请求体计算 HMAC-SHA256，并把结果放到 x-wemail-signature。",
  "目标服务收到请求后，用同一个 Secret 和原始 body 重新计算签名，再与 Header 比对。"
];

type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  events: string[];
  signingSecret?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type WebhookDelivery = {
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

type NotificationRuleDraft = {
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

type EndpointDraft = {
  enabled: boolean;
  events: string[];
  name: string;
  url: string;
};

type OverviewTone = "accent" | "info" | "success" | "warning";

type WebhookCodeBlockProps = {
  copied: boolean;
  copyLabel: string;
  label: string;
  onCopy: () => void;
  value: string;
};

type WebhookEndpointListPayload = {
  endpoints?: WebhookEndpoint[];
  page?: number;
  pageSize?: number;
  total?: number;
};

type WebhookDeliveryListPayload = {
  deliveries?: WebhookDelivery[];
  page?: number;
  pageSize?: number;
  total?: number;
};

type NotificationRuleListPayload = {
  rules?: NotificationRuleSummary[];
};

const emptyDraft: EndpointDraft = {
  enabled: true,
  events: defaultWebhookEvents,
  name: "",
  url: ""
};

const emptyNotificationRuleDraft: NotificationRuleDraft = {
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

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Webhook 配置同步失败，请稍后重试。";
}

function formatDate(value?: string) {
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

function normalizeStatus(status: string) {
  const value = status.toLowerCase();
  if (value === "success" || value === "delivered" || value === "ok") return "成功";
  if (value === "failed" || value === "error") return "失败";
  if (value === "pending" || value === "retrying") return "重试中";
  return status;
}

function isSuccessfulDelivery(delivery: WebhookDelivery) {
  const value = delivery.status.toLowerCase();
  return value === "success" || value === "delivered" || value === "ok";
}

function getEventLabel(value: string) {
  for (const group of webhookEventGroups) {
    const match = group.events.find((event) => event.value === value);
    if (match) return match.label;
  }
  return value;
}

function formatJson(value: unknown) {
  if (typeof value === "undefined") return "{}";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(text);
}

function WebhookCodeBlock({ copied, copyLabel, label, onCopy, value }: WebhookCodeBlockProps) {
  return (
    <article className="webhook-code-card">
      <div className="webhook-code-header">
        <span>{label}</span>
        <Button
          aria-label={copyLabel}
          leadingIcon={<Copy size={14} strokeWidth={1.9} />}
          onClick={onCopy}
          size="sm"
          variant="secondary"
        >
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre>
        <code>{value}</code>
      </pre>
    </article>
  );
}

export function WebhookPage() {
  const pushToast = useAppStore((state) => state.pushToast);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRuleSummary[]>([]);
  const [notificationRuleDraft, setNotificationRuleDraft] = useState<NotificationRuleDraft>(emptyNotificationRuleDraft);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [endpointPage, setEndpointPage] = useState(1);
  const [endpointPageSize, setEndpointPageSize] = useState(WEBHOOK_ENDPOINT_PAGE_SIZE);
  const [endpointTotal, setEndpointTotal] = useState(0);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(WEBHOOK_DELIVERY_PAGE_SIZE);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const [deliveryStatus, setDeliveryStatus] = useState<WebhookDeliveryStatus>("all");
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [expandedEndpointIds, setExpandedEndpointIds] = useState<string[]>([]);
  const [createDraft, setCreateDraft] = useState<EndpointDraft>(emptyDraft);
  const [editingEndpointId, setEditingEndpointId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeliveryLoading, setIsDeliveryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRuleSaving, setIsRuleSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isEndpointActionBusy, setIsEndpointActionBusy] = useState(false);
  const [isDeveloperReferenceOpen, setIsDeveloperReferenceOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState<string | null>(null);
  const [notificationRuleErrorMessage, setNotificationRuleErrorMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadEndpoints = useCallback((options?: { page?: number; pageSize?: number }) => {
    let cancelled = false;
    const requestedPage = options?.page ?? endpointPage;
    const requestedPageSize = options?.pageSize ?? endpointPageSize;
    const endpointParams = new URLSearchParams({
      page: String(requestedPage),
      pageSize: String(requestedPageSize)
    });

    setIsLoading(true);
    void apiFetch<WebhookEndpointListPayload>(`/api/webhook/endpoints?${endpointParams.toString()}`).then((endpointPayload) => {
      if (cancelled) return;
      const nextEndpoints = endpointPayload.endpoints ?? [];
      setEndpoints(nextEndpoints);
      setEndpointTotal(endpointPayload.total ?? nextEndpoints.length);
      setSelectedEndpointId((current) => (nextEndpoints.some((endpoint) => endpoint.id === current) ? current : nextEndpoints[0]?.id ?? null));
      setErrorMessage(null);
    }).catch((error) => {
      if (!cancelled) {
        setEndpoints([]);
        setEndpointTotal(0);
        setSelectedEndpointId(null);
        setErrorMessage(readErrorMessage(error));
      }
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [endpointPage, endpointPageSize]);

  const loadDeliveries = useCallback((options?: { endpointId?: string | null; page?: number; pageSize?: number; status?: WebhookDeliveryStatus }) => {
    let cancelled = false;
    const requestedPage = options?.page ?? deliveryPage;
    const requestedPageSize = options?.pageSize ?? deliveryPageSize;
    const requestedStatus = options?.status ?? deliveryStatus;
    const requestedEndpointId = typeof options?.endpointId === "undefined" ? selectedEndpointId : options.endpointId;
    const deliveryParams = new URLSearchParams({
      page: String(requestedPage),
      pageSize: String(requestedPageSize),
      status: requestedStatus
    });
    if (requestedEndpointId) deliveryParams.set("endpointId", requestedEndpointId);

    setIsDeliveryLoading(true);
    void apiFetch<WebhookDeliveryListPayload>(`/api/webhook/deliveries?${deliveryParams.toString()}`).then((payload) => {
      if (cancelled) return;
      const nextDeliveries = payload.deliveries ?? [];
      setDeliveries(nextDeliveries);
      setDeliveryTotal(payload.total ?? nextDeliveries.length);
      setDeliveryErrorMessage(null);
    }).catch((error) => {
      if (!cancelled) {
        setDeliveries([]);
        setDeliveryTotal(0);
        setDeliveryErrorMessage(readErrorMessage(error));
      }
    }).finally(() => {
      if (!cancelled) setIsDeliveryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [deliveryPage, deliveryPageSize, deliveryStatus, selectedEndpointId]);

  const loadNotificationRules = useCallback(() => {
    let cancelled = false;
    void apiFetch<NotificationRuleListPayload>("/api/notification/rules")
      .then((payload) => {
        if (cancelled) return;
        setNotificationRules(payload.rules ?? []);
        setNotificationRuleErrorMessage(null);
      })
      .catch((error) => {
        if (!cancelled) {
          setNotificationRules([]);
          setNotificationRuleErrorMessage(readErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadEndpoints(), [loadEndpoints]);
  useEffect(() => loadDeliveries(), [loadDeliveries]);
  useEffect(() => loadNotificationRules(), [loadNotificationRules]);

  const selectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId]
  );
  const expandedEndpointSet = useMemo(() => new Set(expandedEndpointIds), [expandedEndpointIds]);
  const createDraftEventSet = useMemo(() => new Set(createDraft.events), [createDraft.events]);
  const latestDelivery = deliveries[0] ?? null;
  const enabledEndpointCount = endpoints.filter((endpoint) => endpoint.enabled).length;
  const selectedEventCount = selectedEndpoint?.events.length ?? 0;
  const failedDeliveryCount = deliveries.filter((delivery) => !isSuccessfulDelivery(delivery)).length;
  const enabledRuleCount = notificationRules.filter((rule) => rule.enabled).length;
  const visibleDeliveries = deliveries;
  const endpointTotalPages = Math.max(1, Math.ceil(endpointTotal / endpointPageSize));
  const currentEndpointPage = Math.min(endpointPage, endpointTotalPages);
  const deliveryTotalPages = Math.max(1, Math.ceil(deliveryTotal / deliveryPageSize));
  const currentDeliveryPage = Math.min(deliveryPage, deliveryTotalPages);
  const isCreateDraftValid = createDraft.name.trim().length > 0 && createDraft.url.trim().length > 0 && createDraft.events.length > 0;
  const isNotificationRuleDraftValid = notificationRuleDraft.name.trim().length > 0 && notificationRuleDraft.eventTypes.length > 0;
  const isEditingEndpoint = Boolean(editingEndpointId);
  const overviewItems: Array<{
    detail: string;
    icon: LucideIcon;
    label: string;
    tone: OverviewTone;
    value: string;
  }> = [
    {
      detail: `${enabledEndpointCount} 个在当前页启用`,
      icon: Link2,
      label: "端点",
      tone: endpointTotal > 0 ? "success" : "warning",
      value: `${endpointTotal} 个`
    },
    {
      detail: selectedEndpoint ? "当前端点订阅" : "先创建端点",
      icon: ListChecks,
      label: "订阅事件",
      tone: "accent",
      value: `${selectedEventCount} 项`
    },
    {
      detail: latestDelivery ? formatDate(latestDelivery.createdAt) : "等待第一次投递",
      icon: RadioTower,
      label: "最近投递",
      tone: latestDelivery && isSuccessfulDelivery(latestDelivery) ? "success" : "info",
      value: latestDelivery ? normalizeStatus(latestDelivery.status) : "暂无"
    },
    {
      detail: failedDeliveryCount > 0 ? "需要查看失败原因" : "当前没有失败记录",
      icon: Activity,
      label: "失败记录",
      tone: failedDeliveryCount > 0 ? "warning" : "success",
      value: `${failedDeliveryCount} 条`
    },
    {
      detail: enabledRuleCount > 0 ? "规则会限制匹配事件" : "无规则时沿用端点订阅",
      icon: ListChecks,
      label: "通知规则",
      tone: enabledRuleCount > 0 ? "success" : "info",
      value: `${enabledRuleCount} 条`
    }
  ];

  useEffect(() => {
    if (endpointPage > endpointTotalPages) {
      setEndpointPage(endpointTotalPages);
    }
  }, [endpointPage, endpointTotalPages]);

  useEffect(() => {
    if (deliveryPage > deliveryTotalPages) {
      setDeliveryPage(deliveryTotalPages);
    }
  }, [deliveryPage, deliveryTotalPages]);

  useEffect(() => {
    setExpandedEndpointIds((current) => current.filter((endpointId) => endpoints.some((endpoint) => endpoint.id === endpointId)));
  }, [endpoints]);

  function handleEndpointPageSizeChange(nextPageSize: number) {
    setEndpointPageSize(nextPageSize);
    setEndpointPage(1);
  }

  function handleDeliveryPageSizeChange(nextPageSize: number) {
    setDeliveryPageSize(nextPageSize);
    setDeliveryPage(1);
  }

  function handleSelectEndpoint(endpointId: string) {
    setSelectedEndpointId(endpointId);
    setDeliveryPage(1);
    setSelectedDelivery(null);
  }

  function handleToggleEndpointDetails(endpointId: string) {
    handleSelectEndpoint(endpointId);
    setExpandedEndpointIds((current) => {
      if (current.includes(endpointId)) return current.filter((currentEndpointId) => currentEndpointId !== endpointId);
      return [...current, endpointId];
    });
  }

  function openCreateDialog() {
    setCreateDraft(emptyDraft);
    setEditingEndpointId(null);
    setErrorMessage(null);
    setIsCreateDialogOpen(true);
  }

  function openEditDialog(endpoint: WebhookEndpoint) {
    setCreateDraft({
      enabled: endpoint.enabled,
      events: endpoint.events,
      name: endpoint.name,
      url: endpoint.url
    });
    setEditingEndpointId(endpoint.id);
    setErrorMessage(null);
    setIsCreateDialogOpen(true);
  }

  function toggleCreateEvent(value: string, checked: boolean) {
    setCreateDraft((current) => {
      const events = new Set(current.events);
      if (checked) {
        events.add(value);
      } else {
        events.delete(value);
      }
      return { ...current, events: Array.from(events) };
    });
  }

  function toggleNotificationRuleEvent(value: string, checked: boolean) {
    setNotificationRuleDraft((current) => {
      const eventTypes = new Set(current.eventTypes);
      if (checked) {
        eventTypes.add(value);
      } else {
        eventTypes.delete(value);
      }
      return { ...current, eventTypes: Array.from(eventTypes) };
    });
  }

  async function saveNotificationRule() {
    if (!isNotificationRuleDraftValid || isRuleSaving) return;
    setIsRuleSaving(true);
    setNotificationRuleErrorMessage(null);
    try {
      const payload = await apiFetch<{ rule: NotificationRuleSummary }>("/api/notification/rules", {
        method: "POST",
        body: JSON.stringify({
          enabled: notificationRuleDraft.enabled,
          eventTypes: notificationRuleDraft.eventTypes,
          keyword: notificationRuleDraft.keyword.trim(),
          mailboxIds: notificationRuleDraft.mailboxIds.split(",").map((value) => value.trim()).filter(Boolean),
          name: notificationRuleDraft.name.trim(),
          quietHoursEnd: notificationRuleDraft.quietHoursEnd,
          quietHoursStart: notificationRuleDraft.quietHoursStart,
          target: notificationRuleDraft.target,
          targetId: notificationRuleDraft.targetId.trim() || null
        })
      });
      setNotificationRules((current) => [payload.rule, ...current]);
      setNotificationRuleDraft(emptyNotificationRuleDraft);
      pushToast({ message: "通知规则已创建。", tone: "success" });
    } catch (error) {
      setNotificationRuleErrorMessage(readErrorMessage(error));
    } finally {
      setIsRuleSaving(false);
    }
  }

  async function deleteNotificationRule(rule: NotificationRuleSummary) {
    const confirmed = window.confirm(`删除通知规则“${rule.name}”？`);
    if (!confirmed) return;
    try {
      await apiFetch<{ ok: boolean }>(`/api/notification/rules/${rule.id}`, { method: "DELETE" });
      setNotificationRules((current) => current.filter((entry) => entry.id !== rule.id));
      pushToast({ message: "通知规则已删除。", tone: "success" });
    } catch (error) {
      pushToast({ message: `通知规则删除失败：${readErrorMessage(error)}`, tone: "error" });
    }
  }

  async function saveEndpoint() {
    if (!isCreateDraftValid || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await apiFetch<{ endpoint: WebhookEndpoint }>(editingEndpointId ? `/api/webhook/endpoints/${editingEndpointId}` : "/api/webhook/endpoints", {
        method: editingEndpointId ? "PUT" : "POST",
        body: JSON.stringify({
          enabled: createDraft.enabled,
          events: createDraft.events,
          name: createDraft.name.trim(),
          url: createDraft.url.trim()
        })
      });
      setEndpoints((current) => {
        if (editingEndpointId) return current.map((endpoint) => (endpoint.id === response.endpoint.id ? response.endpoint : endpoint));
        return [response.endpoint, ...current];
      });
      setSelectedEndpointId(response.endpoint.id);
      setEndpointPage(1);
      setCreateDraft(emptyDraft);
      setEditingEndpointId(null);
      setIsCreateDialogOpen(false);
      pushToast({ message: editingEndpointId ? "Webhook 端点已更新。" : "Webhook 端点已创建。", tone: "success" });
      loadEndpoints({ page: 1 });
      loadDeliveries({ endpointId: response.endpoint.id, page: 1 });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendTestEvent() {
    if (!selectedEndpoint) return;
    setIsSendingTest(true);
    try {
      const payload = await apiFetch<{ delivery: WebhookDelivery }>(`/api/webhook/endpoints/${selectedEndpoint.id}/test`, {
        method: "POST"
      });
      pushToast({
        message: isSuccessfulDelivery(payload.delivery)
          ? `测试事件已发送，目标返回 ${payload.delivery.statusCode ?? "无状态码"}。`
          : `测试事件投递失败：${payload.delivery.errorText ?? "目标服务未接受请求"}`,
        tone: isSuccessfulDelivery(payload.delivery) ? "success" : "error"
      });
      setDeliveryStatus("all");
      setDeliveryPage(1);
      loadDeliveries({ endpointId: selectedEndpoint.id, page: 1, status: "all" });
    } catch (error) {
      pushToast({ message: `测试事件发送失败：${readErrorMessage(error)}`, tone: "error" });
    } finally {
      setIsSendingTest(false);
    }
  }

  async function updateEndpoint(endpoint: WebhookEndpoint, input: EndpointDraft) {
    return apiFetch<{ endpoint: WebhookEndpoint }>(`/api/webhook/endpoints/${endpoint.id}`, {
      method: "PUT",
      body: JSON.stringify({
        enabled: input.enabled,
        events: input.events,
        name: input.name.trim(),
        url: input.url.trim()
      })
    });
  }

  async function handleToggleEndpoint(endpoint: WebhookEndpoint) {
    if (isEndpointActionBusy) return;
    setIsEndpointActionBusy(true);
    try {
      const response = await updateEndpoint(endpoint, {
        enabled: !endpoint.enabled,
        events: endpoint.events,
        name: endpoint.name,
        url: endpoint.url
      });
      setEndpoints((current) => current.map((endpoint) => (endpoint.id === response.endpoint.id ? response.endpoint : endpoint)));
      setSelectedEndpointId(response.endpoint.id);
      pushToast({ message: response.endpoint.enabled ? "Webhook 端点已启用。" : "Webhook 端点已暂停。", tone: "success" });
    } catch (error) {
      pushToast({ message: `端点状态更新失败：${readErrorMessage(error)}`, tone: "error" });
    } finally {
      setIsEndpointActionBusy(false);
    }
  }

  async function handleDeleteEndpoint(endpoint: WebhookEndpoint) {
    if (isEndpointActionBusy) return;
    const confirmed = window.confirm(`删除 Webhook 端点“${endpoint.name}”？相关投递日志也会被移除。`);
    if (!confirmed) return;
    const wasSelected = endpoint.id === selectedEndpointId;
    setIsEndpointActionBusy(true);
    try {
      await apiFetch<{ ok: boolean }>(`/api/webhook/endpoints/${endpoint.id}`, { method: "DELETE" });
      setEndpoints((current) => current.filter((entry) => entry.id !== endpoint.id));
      setEndpointTotal((current) => Math.max(0, current - 1));
      setSelectedEndpointId((current) => (current === endpoint.id ? null : current));
      if (wasSelected) setDeliveryPage(1);
      pushToast({ message: "Webhook 端点已删除。", tone: "success" });
      loadEndpoints({ page: endpointPage });
      if (wasSelected) loadDeliveries({ endpointId: null, page: 1 });
    } catch (error) {
      pushToast({ message: `端点删除失败：${readErrorMessage(error)}`, tone: "error" });
    } finally {
      setIsEndpointActionBusy(false);
    }
  }

  async function handleRotateSecret() {
    if (!selectedEndpoint || isEndpointActionBusy) return;
    setIsEndpointActionBusy(true);
    try {
      const response = await apiFetch<{ endpoint: WebhookEndpoint }>(`/api/webhook/endpoints/${selectedEndpoint.id}/secret`, { method: "POST" });
      setEndpoints((current) => current.map((endpoint) => (endpoint.id === response.endpoint.id ? response.endpoint : endpoint)));
      pushToast({ message: "Signing Secret 已重新生成。", tone: "success" });
    } catch (error) {
      pushToast({ message: `Secret 轮换失败：${readErrorMessage(error)}`, tone: "error" });
    } finally {
      setIsEndpointActionBusy(false);
    }
  }

  async function handleRetryDelivery(delivery: WebhookDelivery) {
    setIsDeliveryLoading(true);
    try {
      const payload = await apiFetch<{ delivery: WebhookDelivery }>(`/api/webhook/deliveries/${delivery.id}/retry`, { method: "POST" });
      pushToast({
        message: isSuccessfulDelivery(payload.delivery)
          ? `重试已送达，目标返回 ${payload.delivery.statusCode ?? "无状态码"}。`
          : `重试失败：${payload.delivery.errorText ?? "目标服务未接受请求"}`,
        tone: isSuccessfulDelivery(payload.delivery) ? "success" : "error"
      });
      loadDeliveries({ page: 1 });
    } catch (error) {
      pushToast({ message: `重试失败：${readErrorMessage(error)}`, tone: "error" });
    } finally {
      setIsDeliveryLoading(false);
    }
  }

  async function handleCopy(token: string, text?: string) {
    if (!text) return;
    await copyText(text);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1500);
  }

  return (
    <main aria-busy={isLoading} className="workspace-grid integration-page-grid webhook-page-grid">
      <section className="panel workspace-card page-panel integration-surface-card webhook-hero-card">
        <div className="webhook-hero-layout">
          <div className="integration-card-copy webhook-hero-copy">
            <p className="panel-kicker">Webhook</p>
            <h1 className="sr-only">Webhook 控制台</h1>
          </div>
          <div className="webhook-hero-actions">
            <Button
              disabled={!selectedEndpoint || isSendingTest}
              isLoading={isSendingTest}
              leadingIcon={<RadioTower size={16} strokeWidth={1.9} />}
              loadingLabel="发送中"
              onClick={handleSendTestEvent}
              variant="primary"
            >
              发送测试事件
            </Button>
          </div>
        </div>

        <section className="webhook-reference-card webhook-hero-reference-card" aria-labelledby="webhook-reference-heading">
          <h2 className="sr-only" id="webhook-reference-heading">开发者参考</h2>
          <button
            aria-controls="webhook-reference-body"
            aria-expanded={isDeveloperReferenceOpen}
            aria-label={isDeveloperReferenceOpen ? "收起开发者参考" : "展开开发者参考"}
            className="webhook-reference-toggle"
            onClick={() => setIsDeveloperReferenceOpen((current) => !current)}
            type="button"
          >
            <span className="webhook-section-title webhook-section-title-kicker">
              <span className="webhook-section-icon" aria-hidden="true">
                <Code2 size={18} strokeWidth={1.8} />
              </span>
              <span className="integration-card-copy compact webhook-kicker-only">
                <span className="panel-kicker">开发者参考</span>
              </span>
            </span>
            <span className="webhook-reference-chevron" aria-hidden="true">
              <ChevronDown size={18} strokeWidth={2} />
            </span>
          </button>
          {isDeveloperReferenceOpen ? (
            <div className="webhook-reference-body" id="webhook-reference-body">
              <section className="webhook-signature-panel" aria-label="Signing Secret">
                <div className="integration-card-copy compact">
                  <p className="panel-kicker">签名校验</p>
                  <h3>Signing Secret</h3>
                  <p className="section-copy">把这个 Secret 保存在你的服务端，用它校验 x-wemail-signature 是否由 WeMail 生成。</p>
                </div>
                <div className="webhook-secret-panel">
                  <code>{selectedEndpoint?.signingSecret ?? "创建端点后生成"}</code>
                  <Button
                    disabled={!selectedEndpoint?.signingSecret}
                    leadingIcon={<Copy size={15} strokeWidth={1.9} />}
                    onClick={() => void handleCopy("secret", selectedEndpoint?.signingSecret)}
                    size="sm"
                    variant="secondary"
                  >
                    {copiedToken === "secret" ? "已复制" : "复制 Secret"}
                  </Button>
                  <Button
                    disabled={!selectedEndpoint || isEndpointActionBusy}
                    leadingIcon={<RotateCw size={15} strokeWidth={1.9} />}
                    onClick={() => void handleRotateSecret()}
                    size="sm"
                    variant="secondary"
                  >
                    轮换 Secret
                  </Button>
                </div>
                <ul className="integration-bullet-list webhook-signature-list">
                  {signatureHelpItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <div className="webhook-reference-grid">
                <WebhookCodeBlock
                  copied={copiedToken === "headers"}
                  copyLabel="复制 Headers 示例"
                  label="Headers"
                  onCopy={() => void handleCopy("headers", sampleHeaders)}
                  value={sampleHeaders}
                />
                <WebhookCodeBlock
                  copied={copiedToken === "body"}
                  copyLabel="复制 Body 示例"
                  label="Body"
                  onCopy={() => void handleCopy("body", samplePayload)}
                  value={samplePayload}
                />
                <WebhookCodeBlock
                  copied={copiedToken === "signature"}
                  copyLabel="复制签名校验说明"
                  label="Signature Verify"
                  onCopy={() => void handleCopy("signature", signatureVerifyExample)}
                  value={signatureVerifyExample}
                />
              </div>
            </div>
          ) : null}
        </section>

        <div className="webhook-overview-grid" role="list" aria-label="Webhook 状态概览">
          {overviewItems.map((item) => {
            const OverviewIcon = item.icon;
            return (
              <div className="webhook-overview-tile" data-tone={item.tone} key={item.label} role="listitem">
                <span className="webhook-overview-icon" aria-hidden="true">
                  <OverviewIcon size={18} strokeWidth={1.8} />
                </span>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </div>
            );
          })}
        </div>

        {errorMessage ? (
          <p className="error-banner webhook-error-banner" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {isLoading ? (
          <p className="empty-state webhook-loading-state" role="status">
            正在加载 Webhook 配置...
          </p>
        ) : null}
      </section>

      <div className="integration-primary-column">
        <section className="panel workspace-card page-panel integration-surface-card webhook-workbench-card">
          <div className="webhook-section-header">
            <div className="webhook-section-title webhook-section-title-kicker">
              <span className="webhook-section-icon" aria-hidden="true">
                <WebhookIcon size={18} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact webhook-kicker-only">
                <p className="panel-kicker">端点列表</p>
                <h2 className="sr-only">端点列表</h2>
              </div>
            </div>
            <div className="webhook-workbench-actions">
              <span className="webhook-state-pill" data-state={endpointTotal > 0 ? "active" : "draft"}>
                共 {endpointTotal} 个
              </span>
              <Button leadingIcon={<Plus size={15} strokeWidth={1.9} />} onClick={openCreateDialog} size="sm" variant="primary">
                新增端点
              </Button>
            </div>
          </div>

          <section aria-label="Webhook 端点列表" className="webhook-endpoint-list-panel webhook-endpoint-list-panel-full">
            {endpoints.length > 0 ? (
              <div className="webhook-endpoint-list" role="list">
                {endpoints.map((endpoint) => {
                  const isExpanded = expandedEndpointSet.has(endpoint.id);
                  const detailsId = `webhook-endpoint-events-${endpoint.id}`;
                  return (
                    <article
                      className="webhook-endpoint-row"
                      data-expanded={isExpanded ? "true" : "false"}
                      data-selected={endpoint.id === selectedEndpoint?.id ? "true" : "false"}
                      key={endpoint.id}
                      role="listitem"
                    >
                      <button
                        aria-controls={detailsId}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "收起" : "展开"} ${endpoint.name} 订阅事件`}
                        className="webhook-endpoint-main"
                        onClick={() => handleToggleEndpointDetails(endpoint.id)}
                        type="button"
                      >
                        <span className="webhook-endpoint-summary">
                          <strong>{endpoint.name}</strong>
                          <small className="webhook-endpoint-url">{endpoint.url}</small>
                          <span className="webhook-endpoint-meta">
                            <small>{endpoint.events.length} 项事件</small>
                            <small>更新于 {formatDate(endpoint.updatedAt)}</small>
                          </span>
                        </span>
                        <em data-state={endpoint.enabled ? "active" : "paused"}>{endpoint.enabled ? "启用" : "暂停"}</em>
                        <span className="webhook-endpoint-chevron" data-expanded={isExpanded ? "true" : "false"} aria-hidden="true">
                          <ChevronDown size={16} strokeWidth={2} />
                        </span>
                      </button>
                      <div className="webhook-endpoint-actions" aria-label={`${endpoint.name} 操作`} role="group">
                        <Button
                          aria-label={`编辑 ${endpoint.name}`}
                          disabled={isEndpointActionBusy}
                          leadingIcon={<Pencil size={14} strokeWidth={1.9} />}
                          onClick={() => openEditDialog(endpoint)}
                          size="xs"
                          variant="secondary"
                        >
                          编辑
                        </Button>
                        <Button
                          aria-label={`${endpoint.enabled ? "暂停" : "启用"} ${endpoint.name}`}
                          disabled={isEndpointActionBusy}
                          leadingIcon={<RefreshCw size={14} strokeWidth={1.9} />}
                          onClick={() => void handleToggleEndpoint(endpoint)}
                          size="xs"
                          variant="secondary"
                        >
                          {endpoint.enabled ? "暂停" : "启用"}
                        </Button>
                        <Button
                          aria-label={`删除 ${endpoint.name}`}
                          disabled={isEndpointActionBusy}
                          leadingIcon={<Trash2 size={14} strokeWidth={1.9} />}
                          onClick={() => void handleDeleteEndpoint(endpoint)}
                          size="xs"
                          variant="danger"
                        >
                          删除
                        </Button>
                      </div>
                      {isExpanded ? (
                        <div className="webhook-endpoint-events" id={detailsId} aria-label={`${endpoint.name} 订阅事件`}>
                          {endpoint.events.map((event) => (
                            <span className="webhook-endpoint-event-chip" key={event}>
                              <strong>{getEventLabel(event)}</strong>
                              <code>{event}</code>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="integration-empty-state compact">
                <strong>尚未创建端点</strong>
                <p className="section-copy">点击“新增端点”填写名称、URL 和事件订阅。</p>
              </div>
            )}

            <Pagination
              aria-label="Webhook 端点分页"
              className="users-list-pagination"
              onChange={setEndpointPage}
              onPageSizeChange={handleEndpointPageSizeChange}
              page={currentEndpointPage}
              pageSize={endpointPageSize}
              pageSizeOptions={WEBHOOK_ENDPOINT_PAGE_SIZE_OPTIONS}
              total={endpointTotal}
            />
          </section>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card webhook-rule-card">
          <div className="webhook-section-header">
            <div className="webhook-section-title webhook-section-title-kicker">
              <span className="webhook-section-icon" aria-hidden="true">
                <ListChecks size={18} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact webhook-kicker-only">
                <p className="panel-kicker">规则引擎</p>
                <h2 className="sr-only">通知规则</h2>
              </div>
            </div>
            <Button
              disabled={!isNotificationRuleDraftValid || isRuleSaving}
              isLoading={isRuleSaving}
              loadingLabel="保存中"
              onClick={() => void saveNotificationRule()}
              size="sm"
              variant="primary"
            >
              保存规则
            </Button>
          </div>

          {notificationRuleErrorMessage ? (
            <p className="error-banner webhook-error-banner" role="alert">
              {notificationRuleErrorMessage}
            </p>
          ) : null}

          <div className="webhook-rule-form">
            <FormField label="规则名称" required>
              <TextInput
                aria-label="通知规则名称"
                onChange={(event) => setNotificationRuleDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：验证码只推送到值班群"
                value={notificationRuleDraft.name}
              />
            </FormField>
            <FormField label="目标">
              <SelectInput
                aria-label="通知规则目标"
                onChange={(event) =>
                  setNotificationRuleDraft((current) => ({ ...current, target: event.target.value as NotificationRuleTarget }))
                }
                value={notificationRuleDraft.target}
              >
                {(Object.keys(notificationTargetLabels) as NotificationRuleTarget[]).map((target) => (
                  <option key={target} value={target}>
                    {notificationTargetLabels[target]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="目标 ID">
              <TextInput
                aria-label="通知规则目标 ID"
                onChange={(event) => setNotificationRuleDraft((current) => ({ ...current, targetId: event.target.value }))}
                placeholder={notificationRuleDraft.target === "webhook" ? "留空代表所有端点，或填 endpoint id" : "留空代表所有目标"}
                value={notificationRuleDraft.targetId}
              />
            </FormField>
            <FormField label="邮箱 ID">
              <TextInput
                aria-label="通知规则邮箱 ID"
                onChange={(event) => setNotificationRuleDraft((current) => ({ ...current, mailboxIds: event.target.value }))}
                placeholder="多个邮箱 ID 用逗号分隔，留空代表全部"
                value={notificationRuleDraft.mailboxIds}
              />
            </FormField>
            <FormField label="关键词">
              <TextInput
                aria-label="通知规则关键词"
                onChange={(event) => setNotificationRuleDraft((current) => ({ ...current, keyword: event.target.value }))}
                placeholder="匹配主题、发件人、提取值或 payload"
                value={notificationRuleDraft.keyword}
              />
            </FormField>
            <FormField label="静默时间">
              <div className="webhook-rule-quiet-hours">
                <TextInput
                  aria-label="通知规则静默开始时间"
                  onChange={(event) => setNotificationRuleDraft((current) => ({ ...current, quietHoursStart: event.target.value }))}
                  type="time"
                  value={notificationRuleDraft.quietHoursStart}
                />
                <TextInput
                  aria-label="通知规则静默结束时间"
                  onChange={(event) => setNotificationRuleDraft((current) => ({ ...current, quietHoursEnd: event.target.value }))}
                  type="time"
                  value={notificationRuleDraft.quietHoursEnd}
                />
              </div>
            </FormField>
          </div>

          <div className="webhook-rule-event-list" aria-label="通知规则事件">
            {notificationRuleEventOptions.map((event) => (
              <CheckboxField
                checked={notificationRuleDraft.eventTypes.includes(event.value)}
                className="webhook-event-option"
                description={<code>{event.value}</code>}
                key={event.value}
                label={event.label}
                onChange={(changeEvent) => toggleNotificationRuleEvent(event.value, changeEvent.target.checked)}
                variant="card"
              />
            ))}
          </div>

          <div className="webhook-rule-list" role="list">
            {notificationRules.map((rule) => (
              <article className="webhook-rule-row" key={rule.id} role="listitem">
                <div>
                  <strong>{rule.name}</strong>
                  <small>
                    {notificationTargetLabels[rule.target]} · {rule.eventTypes.join(", ")}
                  </small>
                  <span>
                    {rule.mailboxIds.length > 0 ? `邮箱 ${rule.mailboxIds.length} 个` : "全部邮箱"}
                    {rule.keyword ? ` · 关键词 ${rule.keyword}` : ""}
                    {rule.quietHoursStart && rule.quietHoursEnd ? ` · 静默 ${rule.quietHoursStart}-${rule.quietHoursEnd}` : ""}
                  </span>
                </div>
                <Button
                  aria-label={`删除通知规则 ${rule.name}`}
                  leadingIcon={<Trash2 size={14} strokeWidth={1.9} />}
                  onClick={() => void deleteNotificationRule(rule)}
                  size="xs"
                  variant="secondary"
                >
                  删除
                </Button>
              </article>
            ))}
            {notificationRules.length === 0 ? (
              <div className="integration-empty-state compact">
                <strong>暂无通知规则</strong>
                <p className="section-copy">未创建规则时，Webhook 和 Telegram 会继续按各自的订阅开关投递。</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card webhook-delivery-card">
          <div className="webhook-section-header">
            <div className="webhook-section-title webhook-section-title-kicker">
              <span className="webhook-section-icon" aria-hidden="true">
                <Clock3 size={18} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact webhook-kicker-only">
                <p className="panel-kicker">运行观察</p>
                <h2 className="sr-only">投递日志</h2>
              </div>
            </div>
            <Button
              disabled={isDeliveryLoading}
              leadingIcon={<RefreshCw size={15} strokeWidth={1.9} />}
              onClick={() => loadDeliveries()}
              size="sm"
              variant="secondary"
            >
              刷新
            </Button>
          </div>

          <div className="webhook-delivery-toolbar" aria-label="投递状态筛选">
            {webhookDeliveryStatusOptions.map((option) => (
              <Button
                aria-pressed={deliveryStatus === option.value}
                className="webhook-delivery-filter"
                contentLayout="plain"
                data-active={deliveryStatus === option.value ? "true" : "false"}
                key={option.value}
                onClick={() => {
                  setDeliveryStatus(option.value);
                  setDeliveryPage(1);
                }}
                type="button"
                variant="text"
              >
                {option.label}
              </Button>
            ))}
          </div>

          {deliveryErrorMessage ? (
            <p className="error-banner webhook-error-banner" role="alert">
              {deliveryErrorMessage}
            </p>
          ) : null}

          {visibleDeliveries.length > 0 ? (
            <div className="webhook-delivery-list" role="list">
              {visibleDeliveries.map((delivery) => (
                <article className="webhook-delivery-row" data-state={isSuccessfulDelivery(delivery) ? "success" : "failed"} key={delivery.id} role="listitem">
                  <span className="webhook-delivery-icon" aria-hidden="true">
                    {isSuccessfulDelivery(delivery) ? <CheckCircle2 size={16} strokeWidth={1.9} /> : <XCircle size={16} strokeWidth={1.9} />}
                  </span>
                  <div>
                    <strong>{getEventLabel(delivery.eventType)}</strong>
                    <small>{formatDate(delivery.createdAt)}</small>
                  </div>
                  <span>{delivery.statusCode ?? "无状态码"}</span>
                  <small>{delivery.durationMs === null ? "未记录耗时" : `${delivery.durationMs} ms`}</small>
                  <div className="webhook-delivery-actions">
                    <Button
                      aria-label="查看投递详情"
                      leadingIcon={<Eye size={14} strokeWidth={1.9} />}
                      onClick={() => setSelectedDelivery(delivery)}
                      size="xs"
                      variant="secondary"
                    >
                      查看
                    </Button>
                    {!isSuccessfulDelivery(delivery) ? (
                      <Button
                        aria-label="重试投递"
                        disabled={isDeliveryLoading}
                        leadingIcon={<RotateCw size={14} strokeWidth={1.9} />}
                        onClick={() => void handleRetryDelivery(delivery)}
                        size="xs"
                        variant="secondary"
                      >
                        重试
                      </Button>
                    ) : null}
                  </div>
                  {delivery.errorText ? <p>{delivery.errorText}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="integration-empty-state compact">
              <strong>{isDeliveryLoading ? "正在加载投递日志" : "暂无投递日志"}</strong>
              <p className="section-copy">创建端点并触发事件后，这里会展示真实投递结果。</p>
            </div>
          )}

          <Pagination
            aria-label="Webhook 投递日志分页"
            className="users-list-pagination"
            onChange={setDeliveryPage}
            onPageSizeChange={handleDeliveryPageSizeChange}
            page={currentDeliveryPage}
            pageSize={deliveryPageSize}
            pageSizeOptions={WEBHOOK_DELIVERY_PAGE_SIZE_OPTIONS}
            total={deliveryTotal}
          />
        </section>
      </div>

      {isCreateDialogOpen ? (
        <OverlayDialog
          className="webhook-create-dialog"
          closeOnBackdrop
          description={isEditingEndpoint ? "调整端点名称、Callback URL、启用状态和事件订阅。" : "填写端点名称、Callback URL，并选择这个端点要接收的事件。"}
          eyebrow="端点配置"
          footer={
            <div className="workspace-dialog-actions integration-inline-actions webhook-dialog-actions">
              <Button
                disabled={isSaving}
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingEndpointId(null);
                }}
                variant="secondary"
              >
                取消
              </Button>
              <Button
                disabled={!isCreateDraftValid}
                form="webhook-create-endpoint-form"
                isLoading={isSaving}
                loadingLabel={isEditingEndpoint ? "更新中" : "创建中"}
                type="submit"
                variant="primary"
              >
                {isEditingEndpoint ? "确认更新" : "创建端点"}
              </Button>
            </div>
          }
          onClose={() => {
            setIsCreateDialogOpen(false);
            setEditingEndpointId(null);
          }}
          size="lg"
          title={isEditingEndpoint ? "编辑端点" : "新增端点"}
        >
          <form
            className="webhook-create-form"
            id="webhook-create-endpoint-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEndpoint();
            }}
          >
            {errorMessage ? (
              <p className="error-banner webhook-dialog-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="webhook-editor-grid">
              <FormField htmlFor="webhook-create-name" label="端点名称">
                <TextInput
                  id="webhook-create-name"
                  onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="输入端点名称"
                  value={createDraft.name}
                />
              </FormField>
              <FormField htmlFor="webhook-create-url" label="Callback URL">
                <TextInput
                  id="webhook-create-url"
                  onChange={(event) => setCreateDraft((current) => ({ ...current, url: event.target.value }))}
                  placeholder="输入接收 Webhook 的 HTTPS 地址"
                  value={createDraft.url}
                />
              </FormField>
            </div>

            <CheckboxField
              checked={createDraft.enabled}
              className="webhook-enabled-card"
              description="暂停后会保留配置和签名密钥，但不会继续投递事件。"
              label={isEditingEndpoint ? "启用这个 Webhook 端点" : "创建后启用这个 Webhook 端点"}
              onChange={(event) => setCreateDraft((current) => ({ ...current, enabled: event.target.checked }))}
              variant="card"
            />

            <div className="webhook-create-events">
              <div className="webhook-panel-title">
                <ListChecks size={16} strokeWidth={1.9} />
                <strong>事件订阅</strong>
              </div>
              <div className="webhook-event-matrix">
                {webhookEventGroups.map((group) => (
                  <article className="webhook-event-group" key={group.title}>
                    <div>
                      <strong>{group.title}</strong>
                      <p>{group.description}</p>
                    </div>
                    <div className="webhook-event-list">
                      {group.events.map((event) => (
                        <CheckboxField
                          checked={createDraftEventSet.has(event.value)}
                          className="webhook-event-option"
                          description={<code>{event.value}</code>}
                          key={event.value}
                          label={event.label}
                          onChange={(changeEvent) => toggleCreateEvent(event.value, changeEvent.target.checked)}
                          variant="card"
                        />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </form>
        </OverlayDialog>
      ) : null}

      {selectedDelivery ? (
        <OverlayDialog
          className="webhook-create-dialog webhook-delivery-dialog"
          closeOnBackdrop
          description="查看本次投递的事件、状态、Payload 和目标服务响应。"
          eyebrow="投递详情"
          footer={
            <div className="workspace-dialog-actions integration-inline-actions webhook-dialog-actions">
              {!isSuccessfulDelivery(selectedDelivery) ? (
                <Button
                  disabled={isDeliveryLoading}
                  leadingIcon={<RotateCw size={15} strokeWidth={1.9} />}
                  onClick={() => void handleRetryDelivery(selectedDelivery)}
                  variant="secondary"
                >
                  重试投递
                </Button>
              ) : null}
              <Button onClick={() => setSelectedDelivery(null)} variant="primary">
                关闭
              </Button>
            </div>
          }
          onClose={() => setSelectedDelivery(null)}
          size="lg"
          title={getEventLabel(selectedDelivery.eventType)}
        >
          <div className="webhook-delivery-detail-grid">
            <article className="integration-stat-row">
              <strong>投递状态</strong>
              <span>{normalizeStatus(selectedDelivery.status)}</span>
            </article>
            <article className="integration-stat-row">
              <strong>状态码</strong>
              <span>{selectedDelivery.statusCode ?? "无状态码"}</span>
            </article>
            <article className="integration-stat-row">
              <strong>耗时</strong>
              <span>{selectedDelivery.durationMs === null ? "未记录耗时" : `${selectedDelivery.durationMs} ms`}</span>
            </article>
            <article className="integration-stat-row">
              <strong>创建时间</strong>
              <span>{formatDate(selectedDelivery.createdAt)}</span>
            </article>
          </div>
          {selectedDelivery.errorText ? (
            <p className="error-banner webhook-error-banner" role="alert">
              {selectedDelivery.errorText}
            </p>
          ) : null}
          <div className="webhook-reference-grid">
            <WebhookCodeBlock
              copied={copiedToken === "delivery-payload"}
              copyLabel="复制投递 Payload"
              label="Payload"
              onCopy={() => void handleCopy("delivery-payload", formatJson(selectedDelivery.payload))}
              value={formatJson(selectedDelivery.payload)}
            />
            <WebhookCodeBlock
              copied={copiedToken === "delivery-response"}
              copyLabel="复制目标响应"
              label="Response"
              onCopy={() => void handleCopy("delivery-response", selectedDelivery.responseText ?? "")}
              value={selectedDelivery.responseText || "目标服务没有返回响应体。"}
            />
          </div>
        </OverlayDialog>
      ) : null}
    </main>
  );
}
