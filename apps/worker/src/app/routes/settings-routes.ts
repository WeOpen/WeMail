import type { Hono } from "hono";
import type { FeatureToggles } from "@wemail/shared";

import type { AppContext } from "../context";
import { getAppServices, requireSessionAuth, requireUser } from "../context";
import { jsonError } from "../services/audit-service";
import { toApiKeySummary } from "./dto/settings-dto";
import { parseApiKeyCreateRequest, parseTelegramUpdateRequest } from "./requests/settings-request";
import {
  createApiKeyUseCase,
  getTelegramSubscription,
  listApiKeys,
  revokeApiKeyUseCase,
  saveTelegramSubscriptionUseCase,
  updateFeatureTogglesUseCase
} from "../use-cases/settings-use-cases";

export function registerSettingsRoutes(app: Hono<AppContext>) {
  app.get("/api/telegram", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const subscription = await getTelegramSubscription(getAppServices(c), user.id);
    return c.json({
      subscription: subscription ? { chatId: subscription.chatId, enabled: subscription.enabled } : null
    });
  });

  app.put("/api/telegram", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const { chatId, enabled } = await parseTelegramUpdateRequest(c.req.raw);
    const subscription = await saveTelegramSubscriptionUseCase(getAppServices(c), {
      userId: user.id,
      chatId,
      enabled
    });
    if (subscription instanceof Response) return subscription;
    return c.json({ subscription: { chatId: subscription.chatId, enabled: subscription.enabled } });
  });

  app.get("/api/keys", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json({
      keys: (await listApiKeys(getAppServices(c), user.id)).map(toApiKeySummary)
    });
  });

  app.post("/api/keys", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    if (!requireSessionAuth(c)) return jsonError("API keys must be created from a session-authenticated request", 403);
    const { label } = await parseApiKeyCreateRequest(c.req.raw);
    const key = await createApiKeyUseCase(getAppServices(c), {
      userId: user.id,
      label: String(label ?? "Default key")
    });
    return c.json({ key }, 201);
  });

  app.delete("/api/keys/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json(await revokeApiKeyUseCase(getAppServices(c), { userId: user.id, keyId: c.req.param("id") }));
  });

  app.get("/admin/features", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) {
      return jsonError("Admin session required", 403);
    }
    return c.json({ featureToggles: c.get("featureToggles") });
  });

  app.patch("/admin/features", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) {
      return jsonError("Admin session required", 403);
    }

    const next = await updateFeatureTogglesUseCase(
      {
        ...getAppServices(c),
        currentFeatureToggles: c.get("featureToggles")
      },
      (await c.req.json()) as Partial<FeatureToggles>,
      user.id
    );
    return c.json({ featureToggles: next });
  });
}
