import type { Hono } from "hono";

import type { AppContext } from "../app/context";
import { registerAccountsRoutes } from "./accounts/routes";
import { registerAnnouncementsRoutes } from "./announcements/routes";
import { registerApiKeysRoutes } from "./api-keys/routes";
import { registerAuthRoutes } from "./auth/routes";
import { registerDashboardRoutes } from "./dashboard/routes";
import { registerMailRoutes } from "./mail/routes";
import { registerSystemRoutes } from "./system/routes";
import { registerTelegramRoutes } from "./telegram/routes";
import { registerUsersRoutes } from "./users/routes";
import { registerWebhookRoutes } from "./webhook/routes";

export function registerMenuModules(app: Hono<AppContext>) {
  registerSystemRoutes(app);
  registerAuthRoutes(app);
  registerDashboardRoutes(app);
  registerAccountsRoutes(app);
  registerMailRoutes(app);
  registerUsersRoutes(app);
  registerApiKeysRoutes(app);
  registerWebhookRoutes(app);
  registerTelegramRoutes(app);
  registerAnnouncementsRoutes(app);
}
