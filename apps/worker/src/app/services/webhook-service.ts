import type { AppStore, WebhookDeliveryRecord, WebhookEndpointRecord } from "../../core/bindings";

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
  endpoint: {
    id: string;
    name: string;
  };
  eventType: string;
};

const privateIpv4Ranges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./
];

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function truncateText(value: string, maxLength = 2000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
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
    if (payload && typeof payload.eventType === "string" && typeof payload.data === "object" && payload.data !== null) return payload;
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
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || hostname.endsWith(".local")) {
    throw new Error("Webhook URL must not target local addresses");
  }
  if (privateIpv4Ranges.some((range) => range.test(hostname))) {
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
    createdAt: delivery.createdAt
  };
}

export async function sendWebhookEventToEndpoint(
  store: AppStore,
  endpoint: WebhookEndpointRecord,
  eventType: string,
  data: Record<string, unknown>
) {
  const deliveryId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const payload: WebhookDispatchPayload = {
    createdAt,
    data,
    deliveryId,
    endpoint: {
      id: endpoint.id,
      name: endpoint.name
    },
    eventType
  };
  const body = JSON.stringify(payload);
  const startedAt = Date.now();
  let status = "failed";
  let statusCode: number | null = null;
  let errorText: string | null = null;
  let responseText: string | null = null;

  try {
    const signature = await signWebhookPayload(endpoint.signingSecret, body);
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "WeMail-Webhook/1.0",
        "x-wemail-delivery-id": deliveryId,
        "x-wemail-event": eventType,
        "x-wemail-signature": signature
      },
      body
    });
    statusCode = response.status;
    responseText = truncateText(await response.text().catch(() => ""));
    if (response.ok) {
      status = "success";
    } else {
      errorText = `HTTP ${response.status}${responseText ? `: ${responseText}` : ""}`;
    }
  } catch (error) {
    errorText = error instanceof Error ? error.message : "Webhook request failed";
  }

  return store.webhookDeliveries.record({
    id: deliveryId,
    endpointId: endpoint.id,
    eventType,
    status,
    statusCode,
    durationMs: Date.now() - startedAt,
    errorText,
    payloadJson: body,
    responseText: responseText || null,
    createdAt
  });
}

export async function sendWebhookEventToUser(store: AppStore, userId: string, eventType: string, data: Record<string, unknown>) {
  const endpoints = await store.webhookEndpoints.listByUser(userId);
  const subscribedEndpoints = endpoints.filter((endpoint) => endpoint.enabled && readEndpointEvents(endpoint).includes(eventType));

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
  return sendWebhookEventToEndpoint(store, endpoint, payload?.eventType ?? delivery.eventType, {
    ...(payload?.data ?? {}),
    retryOfDeliveryId: delivery.id
  });
}
