import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { parseTelegramUpdateRequest } from "../../app/routes/requests/settings-request";
import { getTelegramSubscription, saveTelegramSubscriptionUseCase } from "../../app/use-cases/settings-use-cases";

export function registerTelegramRoutes(app: Hono<AppContext>) {
  app.get("/api/telegram/subscription", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const subscription = await getTelegramSubscription(getAppServices(c), user.id);
    return c.json({
      subscription: subscription ? { chatId: subscription.chatId, enabled: subscription.enabled } : null
    });
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
}
