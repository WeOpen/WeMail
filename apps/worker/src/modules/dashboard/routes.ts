import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";

export function registerDashboardRoutes(app: Hono<AppContext>) {
  app.get("/api/dashboard", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const store = c.get("store");
    const [accounts, apiKeys, announcements] = await Promise.all([
      store.mailboxes.listByUser(user.id),
      store.apiKeys.listByUser(user.id),
      store.announcements.list()
    ]);

    return c.json({
      summary: {
        accounts: accounts.length,
        activeApiKeys: apiKeys.filter((key) => !key.revokedAt).length,
        announcements: announcements.length,
        role: user.role
      },
      featureToggles: c.get("featureToggles")
    });
  });
}
