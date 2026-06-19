import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { parseTelegramUpdateRequest } from "../../app/routes/requests/settings-request";
import { resolveAppConfig } from "../../core/config";
import {
  createTelegramLinkCodeUseCase,
  getTelegramOverviewUseCase,
  getTelegramSubscription,
  handleTelegramWebhookUseCase,
  listTelegramDeliveriesUseCase,
  saveTelegramSubscriptionUseCase,
  sendTelegramTestMessageUseCase
} from "../../app/use-cases/settings-use-cases";

export function registerTelegramRoutes(app: Hono<AppContext>) {
  app.get("/api/telegram/overview", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const overview = await getTelegramOverviewUseCase(getAppServices(c), user.id);
    return c.json({ overview });
  });

  app.get("/api/telegram/subscription", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const subscription = await getTelegramSubscription(getAppServices(c), user.id);
    return c.json({
      subscription: subscription ? { chatId: subscription.chatId, enabled: subscription.enabled } : null
    });
  });

  app.get("/api/telegram/deliveries", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json({ deliveries: await listTelegramDeliveriesUseCase(getAppServices(c), user.id) });
  });

  app.post("/api/telegram/link-code", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const link = await createTelegramLinkCodeUseCase(getAppServices(c), user.id);
    if (link instanceof Response) return link;
    return c.json({ link });
  });

  app.post("/api/telegram/webhook", async (c) => {
    const secret = resolveAppConfig(c.env).integrations.telegramWebhookSecret;
    if (secret && c.req.header("x-telegram-bot-api-secret-token") !== secret) {
      return jsonError("Invalid Telegram webhook secret", 401);
    }

    const update = await c.req.json().catch(() => null);
    const result = await handleTelegramWebhookUseCase(getAppServices(c), update);
    return c.json({ result });
  });

  app.put("/api/telegram/subscription", async (c) => {
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

  app.post("/api/telegram/test-message", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const result = await sendTelegramTestMessageUseCase(getAppServices(c), user.id);
    if (result instanceof Response) return result;
    return c.json({ result });
  });
}
