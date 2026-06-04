import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";

const defaultEvents = ["message.received", "message.extracted", "message.failed"];

function endpointJson(endpoint: Awaited<ReturnType<AppContext["Variables"]["store"]["webhookEndpoints"]["create"]>>) {
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
    const endpoints = await c.get("store").webhookEndpoints.listByUser(user.id);
    return c.json({ endpoints: endpoints.map(endpointJson) });
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
    if (!payload.url) return jsonError("Webhook URL is required", 400);
    const endpoint = await c.get("store").webhookEndpoints.create({
      userId: user.id,
      name: payload.name?.trim() || "Production Sync",
      url: payload.url,
      eventsJson: JSON.stringify(payload.events?.length ? payload.events : defaultEvents),
      enabled: payload.enabled ?? true
    });
    await recordAudit(c.get("store"), "user", user.id, "webhook-create", { endpointId: endpoint.id });
    return c.json({ endpoint: endpointJson(endpoint) }, 201);
  });

  app.put("/api/webhook/endpoints/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const payload = (await c.req.json()) as {
      name?: string;
      url?: string;
      events?: string[];
      enabled?: boolean;
    };
    if (!payload.url) return jsonError("Webhook URL is required", 400);
    const endpoint = await c.get("store").webhookEndpoints.update(c.req.param("id"), user.id, {
      name: payload.name?.trim() || "Production Sync",
      url: payload.url,
      eventsJson: JSON.stringify(payload.events?.length ? payload.events : defaultEvents),
      enabled: payload.enabled ?? true
    });
    if (!endpoint) return jsonError("Webhook endpoint not found", 404);
    await recordAudit(c.get("store"), "user", user.id, "webhook-update", { endpointId: endpoint.id });
    return c.json({ endpoint: endpointJson(endpoint) });
  });

  app.delete("/api/webhook/endpoints/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    await c.get("store").webhookEndpoints.delete(c.req.param("id"), user.id);
    await recordAudit(c.get("store"), "user", user.id, "webhook-delete", { endpointId: c.req.param("id") });
    return c.json({ ok: true });
  });

  app.get("/api/webhook/deliveries", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const deliveries = await c.get("store").webhookDeliveries.listByUser(user.id);
    return c.json({
      deliveries: deliveries.map((delivery) => ({
        ...delivery,
        payload: JSON.parse(delivery.payloadJson)
      }))
    });
  });
}
