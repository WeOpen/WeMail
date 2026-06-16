import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import {
  normalizeWebhookEvents,
  retryWebhookDelivery,
  sendWebhookTestEvent,
  validateWebhookTargetUrl,
  webhookDeliveryJson
} from "../../app/services/webhook-service";
import type { WebhookEndpointRecord } from "../../core/bindings";

const webhookEndpointPageSizes = new Set([5, 10, 20, 50]);
const webhookDeliveryPageSizes = new Set([5, 10, 20, 50]);

type ParsedEndpointPayload =
  | { error: string }
  | {
      input: {
        enabled: boolean;
        eventsJson: string;
        name: string;
        url: string;
      };
    };

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.trunc(parsed);
}

function parseWebhookEndpointPageSize(value: string | undefined) {
  const parsed = parsePositiveInteger(value, 5);
  if (webhookEndpointPageSizes.has(parsed)) return parsed;
  if (parsed > 50) return 50;
  return 5;
}

function parseWebhookDeliveryPageSize(value: string | undefined) {
  const parsed = parsePositiveInteger(value, 5);
  if (webhookDeliveryPageSizes.has(parsed)) return parsed;
  if (parsed > 50) return 50;
  return 5;
}

function parseWebhookDeliveryStatus(value: string | undefined) {
  if (value === "success" || value === "failed") return value;
  return "all";
}

function parseEndpointPayload(payload: { name?: string; url?: string; events?: string[]; enabled?: boolean }): ParsedEndpointPayload {
  const name = payload.name?.trim();
  const url = payload.url?.trim();
  let events: string[] = [];

  if (!name) return { error: "Webhook name is required" } as const;
  if (!url) return { error: "Webhook URL is required" } as const;
  if (name.length > 120) return { error: "Webhook name is too long" } as const;
  try {
    events = normalizeWebhookEvents(
      Array.isArray(payload.events) ? payload.events.map((event) => event.trim()).filter((event) => event.length > 0) : []
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Webhook events are invalid" } as const;
  }
  if (events.length === 0) return { error: "Webhook events are required" } as const;

  let normalizedUrl: string;
  try {
    normalizedUrl = validateWebhookTargetUrl(url);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Webhook URL is invalid" } as const;
  }

  return {
    input: {
      enabled: payload.enabled ?? true,
      eventsJson: JSON.stringify(events),
      name,
      url: normalizedUrl
    }
  } as const;
}

function endpointJson(endpoint: WebhookEndpointRecord) {
  return {
    id: endpoint.id,
    name: endpoint.name,
    url: endpoint.url,
    events: JSON.parse(endpoint.eventsJson) as string[],
    signingSecret: endpoint.signingSecret,
    enabled: endpoint.enabled,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt
  };
}

export function registerWebhookRoutes(app: Hono<AppContext>) {
  app.get("/api/webhook/endpoints", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    if (!c.req.query("page") && !c.req.query("pageSize")) {
      const endpoints = await c.get("store").webhookEndpoints.listByUser(user.id);
      return c.json({
        endpoints: endpoints.map(endpointJson),
        page: 1,
        pageSize: endpoints.length,
        total: endpoints.length
      });
    }
    const result = await c.get("store").webhookEndpoints.listByUserPage(user.id, {
      page: parsePositiveInteger(c.req.query("page"), 1),
      pageSize: parseWebhookEndpointPageSize(c.req.query("pageSize"))
    });
    return c.json({
      endpoints: result.endpoints.map(endpointJson),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    });
  });

  app.post("/api/webhook/endpoints", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const payload = (await c.req.json().catch(() => ({}))) as {
      name?: string;
      url?: string;
      events?: string[];
      enabled?: boolean;
    };
    const parsed = parseEndpointPayload(payload);
    if ("error" in parsed) return jsonError(parsed.error, 400);
    const endpoint = await c.get("store").webhookEndpoints.create({
      userId: user.id,
      ...parsed.input
    });
    await recordAudit(c.get("store"), "user", user.id, "webhook-create", { endpointId: endpoint.id });
    return c.json({ endpoint: endpointJson(endpoint) }, 201);
  });

  app.put("/api/webhook/endpoints/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const endpointId = c.req.param("id");
    if (!endpointId) return jsonError("Webhook endpoint id is required", 400);
    const payload = (await c.req.json()) as {
      name?: string;
      url?: string;
      events?: string[];
      enabled?: boolean;
    };
    const parsed = parseEndpointPayload(payload);
    if ("error" in parsed) return jsonError(parsed.error, 400);
    const endpoint = await c.get("store").webhookEndpoints.update(endpointId, user.id, parsed.input);
    if (!endpoint) return jsonError("Webhook endpoint not found", 404);
    await recordAudit(c.get("store"), "user", user.id, "webhook-update", { endpointId: endpoint.id });
    return c.json({ endpoint: endpointJson(endpoint) });
  });

  app.post("/api/webhook/endpoints/:id/test", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const endpointId = c.req.param("id");
    if (!endpointId) return jsonError("Webhook endpoint id is required", 400);
    try {
      const delivery = await sendWebhookTestEvent(c.get("store"), user.id, endpointId);
      if (!delivery) return jsonError("Webhook endpoint not found", 404);
      await recordAudit(c.get("store"), "user", user.id, "webhook-test", { endpointId, deliveryId: delivery.id });
      return c.json({ delivery: webhookDeliveryJson(delivery) });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Webhook test delivery failed", 400);
    }
  });

  app.post("/api/webhook/endpoints/:id/secret", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const endpointId = c.req.param("id");
    if (!endpointId) return jsonError("Webhook endpoint id is required", 400);
    const endpoint = await c.get("store").webhookEndpoints.rotateSecret(endpointId, user.id);
    if (!endpoint) return jsonError("Webhook endpoint not found", 404);
    await recordAudit(c.get("store"), "user", user.id, "webhook-secret-rotate", { endpointId });
    return c.json({ endpoint: endpointJson(endpoint) });
  });

  app.delete("/api/webhook/endpoints/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const endpointId = c.req.param("id");
    if (!endpointId) return jsonError("Webhook endpoint id is required", 400);
    await c.get("store").webhookEndpoints.delete(endpointId, user.id);
    await recordAudit(c.get("store"), "user", user.id, "webhook-delete", { endpointId });
    return c.json({ ok: true });
  });

  app.get("/api/webhook/deliveries", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const result = await c.get("store").webhookDeliveries.listByUserPage(user.id, {
      endpointId: c.req.query("endpointId") || undefined,
      page: parsePositiveInteger(c.req.query("page"), 1),
      pageSize: parseWebhookDeliveryPageSize(c.req.query("pageSize")),
      status: parseWebhookDeliveryStatus(c.req.query("status"))
    });
    return c.json({
      deliveries: result.deliveries.map(webhookDeliveryJson),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    });
  });

  app.get("/api/webhook/deliveries/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const delivery = await c.get("store").webhookDeliveries.findByUser(c.req.param("id"), user.id);
    if (!delivery) return jsonError("Webhook delivery not found", 404);
    return c.json({ delivery: webhookDeliveryJson(delivery) });
  });

  app.post("/api/webhook/deliveries/:id/retry", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    try {
      const delivery = await retryWebhookDelivery(c.get("store"), user.id, c.req.param("id"));
      if (!delivery) return jsonError("Webhook delivery not found", 404);
      await recordAudit(c.get("store"), "user", user.id, "webhook-retry", { deliveryId: c.req.param("id"), retryDeliveryId: delivery.id });
      return c.json({ delivery: webhookDeliveryJson(delivery) });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Webhook retry failed", 400);
    }
  });
}
