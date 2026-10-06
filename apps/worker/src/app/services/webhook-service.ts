import type { AppStore, WebhookDeliveryRecord, WebhookEndpointRecord } from "../../core/bindings";
import { readRetryAfter } from "../../shared/provider-response";
import { shouldSendNotificationToTarget } from "./notification-rule-service";

export const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_RESPONSE_BYTES = 16_384;
const CHAT_TEXT_BYTES = 1800;

export const webhookEventIds = [
  "message.received",
  "message.extracted",
  "message.failed",
  "telegram.sent",
  "telegram.failed",
  "api_key.created",
  "api_key.revoked",
  "settings.updated"
] as const;

type WebhookDispatchPayload = {
  createdAt: string;
  data: Record<string, unknown>;
  deliveryId: string;
  eventId?: string;
  notificationTaskId?: string;
  endpoint: {
    id: string;
    name: string;
  };
  eventType: string;
};

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseIpv4Address(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => Number(part));
  if (bytes.some((byte, index) => !Number.isInteger(byte) || byte < 0 || byte > 255 || String(byte) !== parts[index])) {
    return null;
  }
  return bytes as [number, number, number, number];
}

function isPrivateOrReservedIpv4(hostname: string) {
  const bytes = parseIpv4Address(hostname);
  if (!bytes) return false;
  const [first, second] = bytes;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateOrReservedIpv6(hostname: string) {
  if (!hostname.startsWith("[") || !hostname.endsWith("]")) return false;
  const value = hostname.slice(1, -1).toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab][0-9a-f]?:/.test(value)) return true;
  const mappedIpv4 = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return isPrivateOrReservedIpv4(mappedIpv4[1]);
  const mappedIpv4Hex = value.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!mappedIpv4Hex) return false;
  const high = Number.parseInt(mappedIpv4Hex[1], 16);
  const low = Number.parseInt(mappedIpv4Hex[2], 16);
  return isPrivateOrReservedIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
}

function truncateText(value: string, maxLength = 2000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function truncateUtf8(value: string, maxBytes: number) {
  const encoder = new TextEncoder();
  if (encoder.encode(value).byteLength <= maxBytes) return value;
  let bytes = 0;
  let result = "";
  for (const character of value) {
    const length = encoder.encode(character).byteLength;
    if (bytes + length > maxBytes - 3) break;
    result += character;
    bytes += length;
  }
  return `${result}…`;
}

function readEndpointEvents(endpoint: WebhookEndpointRecord) {
  try {
    const events = JSON.parse(endpoint.eventsJson);
    return Array.isArray(events) ? events.filter((event): event is string => typeof event === "string") : [];
  } catch {
    return [];
  }
}

function parseDeliveryPayload(delivery: WebhookDeliveryRecord): WebhookDispatchPayload | null {
  try {
    const payload = JSON.parse(delivery.payloadJson) as WebhookDispatchPayload;
    if (payload && typeof payload.eventType === "string" && typeof payload.data === "object" && payload.data !== null && !Array.isArray(payload.data)) return payload;
  } catch {
    return null;
  }
  return null;
}

async function signWebhookPayload(secret: string, body: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `sha256=${bytesToHex(signature)}`;
}

export function normalizeWebhookEvents(events: string[]) {
  const allowed = new Set<string>(webhookEventIds);
  const normalized: string[] = [];
  for (const event of events) {
    const value = event.trim();
    if (!allowed.has(value)) {
      throw new Error(`Unsupported webhook event: ${value || "(empty)"}`);
    }
    if (!normalized.includes(value)) normalized.push(value);
  }
  return normalized;
}

export function validateWebhookTargetUrl(value: string) {
  if (value.length > 2048) throw new Error("Webhook URL is too long");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Webhook URL must be a valid HTTPS URL");
  }

  if (parsed.protocol !== "https:") throw new Error("Webhook URL must use HTTPS");
  if (parsed.username || parsed.password) throw new Error("Webhook URL must not include credentials");

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Webhook URL must not target local addresses");
  }
  if (isPrivateOrReservedIpv4(hostname) || isPrivateOrReservedIpv6(hostname)) {
    throw new Error("Webhook URL must not target private network addresses");
  }

  return parsed.toString();
}

export function webhookDeliveryJson(delivery: WebhookDeliveryRecord) {
  return {
    id: delivery.id,
    endpointId: delivery.endpointId,
    eventType: delivery.eventType,
    status: delivery.status,
    statusCode: delivery.statusCode,
    durationMs: delivery.durationMs,
    errorText: delivery.errorText,
    responseText: delivery.responseText,
    payload: JSON.parse(delivery.payloadJson) as WebhookDispatchPayload,
    requestBodyText: delivery.requestBodyText ?? null,
    createdAt: delivery.createdAt
  };
}

const channelEventLabels: Record<string, string> = {
  "message.received": "新邮件",
  "message.extracted": "提取结果",
  "message.extraction.detected": "提取结果",
  "message.failed": "发件失败",
  "api_key.created": "API 密钥已创建",
  "api_key.revoked": "API 密钥已吊销"
};

function buildChannelText(eventType: string, data: Record<string, unknown>) {
  const label = channelEventLabels[eventType] ?? eventType;
  const metadata = [data.mailboxAddress, data.subject, data.fromAddress]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const extraction = data.extraction && typeof data.extraction === "object" ? data.extraction as Record<string, unknown> : null;
  const findings = Array.isArray(data.extractions)
    ? data.extractions
    : Array.isArray(extraction?.items)
      ? extraction.items
      : [extraction?.primary ?? data.extraction];
  const values = findings.flatMap((finding) => {
    if (typeof finding === "string") return [finding];
    if (!finding || typeof finding !== "object") return [];
    const value = "value" in finding ? finding.value : null;
    return typeof value === "string" && value ? [value] : [];
  });
  const uniqueValues = [...new Set(values)];
  // Reserve room for the primary finding and expiry before metadata; an
  // arbitrary subject must not hide the verification code from a notification.
  const parts = uniqueValues.slice(0, 1).map((value) => truncateUtf8(value, 500));
  const expiresHint = data.expiresHint ?? extraction?.expiresHint;
  if (typeof expiresHint === "string" && expiresHint) parts.push(truncateUtf8(expiresHint, 160));
  parts.push(...metadata.map((value) => truncateUtf8(value, 250)));
  parts.push(...uniqueValues.slice(1).map((value) => truncateUtf8(value, 500)));
  const detail = parts.length > 0 ? `\n${parts.join(" · ")}` : "";
  // A conservative UTF-8 budget fits every supported chat channel, including
  // byte-limited channels and multibyte Chinese text. Do not split code points.
  return truncateUtf8(`【WeMail】${label}${detail}`, CHAT_TEXT_BYTES);
}

async function readBoundedResponse(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  try {
    while (bytesRead < WEBHOOK_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = WEBHOOK_RESPONSE_BYTES - bytesRead;
      text += decoder.decode(value.subarray(0, remaining), { stream: true });
      bytesRead += Math.min(value.byteLength, remaining);
      if (value.byteLength >= remaining) {
        await reader.cancel();
        break;
      }
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function readChannelError(channel: string | null | undefined, responseText: string) {
  if (channel === "slack") return responseText.trim() === "ok" ? null : `Slack rejected delivery: ${responseText || "empty response"}`;
  if (channel !== "feishu" && channel !== "wecom" && channel !== "discord") return null;
  try {
    const payload = JSON.parse(responseText) as Record<string, unknown>;
    if (channel === "discord") return typeof payload.id === "string" && payload.id ? null : "Discord did not confirm a created message";
    // Feishu's current response uses code; older bots return StatusCode.
    const code = channel === "wecom" ? payload.errcode : (payload.code ?? payload.StatusCode);
    return code === 0 ? null : `${channel} rejected delivery: ${responseText}`;
  } catch {
    return `${channel} returned an invalid acknowledgement`;
  }
}

// Chat platforms each expect their own body shape; the generic webhook keeps
// the full WeMail JSON envelope. The canonical payload is always what gets
// recorded for replay — the rendering happens at send time.
function renderChannelBody(channel: string | null | undefined, eventType: string, data: Record<string, unknown>) {
  switch (channel) {
    case "slack":
      return JSON.stringify({ text: buildChannelText(eventType, data) });
    case "discord":
      return JSON.stringify({ content: buildChannelText(eventType, data), allowed_mentions: { parse: [] } });
    case "feishu":
      return JSON.stringify({ msg_type: "text", content: { text: buildChannelText(eventType, data) } });
    case "wecom":
      return JSON.stringify({ msgtype: "text", text: { content: buildChannelText(eventType, data) } });
    default:
      return null;
  }
}

export async function sendWebhookEventToEndpoint(
  store: AppStore,
  endpoint: WebhookEndpointRecord,
  eventType: string,
  data: Record<string, unknown>,
  options?: { eventId?: string; notificationTaskId?: string }
) {
  const deliveryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const payload: WebhookDispatchPayload = {
    createdAt,
    data,
    deliveryId,
    eventId: options?.eventId,
    notificationTaskId: options?.notificationTaskId,
    endpoint: {
      id: endpoint.id,
      name: endpoint.name
    },
    eventType
  };
  const channelBody = renderChannelBody(endpoint.channel, eventType, data);
  const body = channelBody ?? JSON.stringify(payload);
  const startedAt = Date.now();
  let status = "failed";
  let statusCode: number | null = null;
  let errorText: string | null = null;
  let responseText: string | null = null;
  let retryAfterMs: number | undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const signature = await signWebhookPayload(endpoint.signingSecret, body);
    const targetUrl = new URL(endpoint.url);
    // Discord's default wait=false can acknowledge an unsaved message. Ask
    // for the created message so success means a confirmed platform receipt.
    if (endpoint.channel === "discord") targetUrl.searchParams.set("wait", "true");
    const response = await fetch(targetUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "WeMail-Webhook/1.0",
        "x-wemail-delivery-id": deliveryId,
        "x-wemail-event": eventType,
        ...(options?.eventId ? { "x-wemail-event-id": options.eventId } : {}),
        "x-wemail-signature": signature
      },
      body,
      signal: controller.signal,
      redirect: "error"
    });
    statusCode = response.status;
    retryAfterMs = readRetryAfter(response.headers.get("retry-after"));
    const acknowledgement = await readBoundedResponse(response);
    responseText = truncateText(acknowledgement);
    if (response.ok) {
      errorText = readChannelError(endpoint.channel, acknowledgement);
      if (!errorText) status = "success";
    } else {
      errorText = `HTTP ${response.status}${responseText ? `: ${responseText}` : ""}`;
    }
  } catch (error) {
    errorText = controller.signal.aborted ? "Webhook delivery timed out" : error instanceof Error ? error.message : "Webhook request failed";
  } finally {
    clearTimeout(timeout);
  }

  const delivery = await store.webhookDeliveries.record({
    id: deliveryId,
    endpointId: endpoint.id,
    eventType,
    status,
    statusCode,
    durationMs: Date.now() - startedAt,
    errorText,
    payloadJson: JSON.stringify(payload),
    requestBodyText: body,
    responseText: responseText || null,
    createdAt
  });
  return { ...delivery, retryAfterMs };
}

export async function sendWebhookEventToUser(store: AppStore, userId: string, eventType: string, data: Record<string, unknown>) {
  const endpoints = await store.webhookEndpoints.listByUser(userId);
  const subscribedEndpoints = (
    await Promise.all(
      endpoints
        .filter((endpoint) => endpoint.enabled && readEndpointEvents(endpoint).includes(eventType))
        .map(async (endpoint) => ({
          endpoint,
          shouldSend: await shouldSendNotificationToTarget(store, userId, {
            data,
            eventType,
            target: endpoint.channel ?? "webhook",
            targetId: endpoint.id
          })
        }))
    )
  )
    .filter((entry) => entry.shouldSend)
    .map((entry) => entry.endpoint);

  return Promise.all(subscribedEndpoints.map((endpoint) => sendWebhookEventToEndpoint(store, endpoint, eventType, data)));
}

export async function sendWebhookTestEvent(store: AppStore, userId: string, endpointId: string) {
  const endpoint = (await store.webhookEndpoints.listByUser(userId)).find((entry) => entry.id === endpointId);
  if (!endpoint) return null;
  if (!endpoint.enabled) throw new Error("Webhook endpoint must be enabled before sending a test event");

  return sendWebhookEventToEndpoint(store, endpoint, "webhook.test", {
    message: "WeMail webhook test event",
    sentAt: new Date().toISOString()
  });
}

export async function retryWebhookDelivery(store: AppStore, userId: string, deliveryId: string) {
  const delivery = await store.webhookDeliveries.findByUser(deliveryId, userId);
  if (!delivery) return null;
  const endpoint = (await store.webhookEndpoints.listByUser(userId)).find((entry) => entry.id === delivery.endpointId);
  if (!endpoint) return null;
  if (!endpoint.enabled) throw new Error("Webhook endpoint must be enabled before retrying a delivery");

  const payload = parseDeliveryPayload(delivery);
  if (!payload) throw new Error("Original webhook event is unavailable; this legacy chat delivery cannot be replayed");
  return sendWebhookEventToEndpoint(store, endpoint, payload.eventType, {
    ...payload.data,
    retryOfDeliveryId: delivery.id
  }, { eventId: payload.eventId });
}
