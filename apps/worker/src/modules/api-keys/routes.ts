import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { toApiKeySummary } from "../../app/routes/dto/settings-dto";
import { parseApiKeyCreateRequest } from "../../app/routes/requests/settings-request";
import { createApiKeyUseCase, listApiKeys, revokeApiKeyUseCase } from "../../app/use-cases/settings-use-cases";

const ADMIN_AUTOMATION_SCOPE = "admin:automation";

export function registerApiKeysRoutes(app: Hono<AppContext>) {
  app.get("/api/api-keys", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json({
      keys: (await listApiKeys(getAppServices(c), user.id)).map(toApiKeySummary)
    });
  });

  app.post("/api/api-keys", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    if (!requireSessionAuth(c)) return jsonError("API keys must be created from a session-authenticated request", 403);
    const { label, scopes } = await parseApiKeyCreateRequest(c.req.raw);
    if (user.role !== "admin" && scopes.includes(ADMIN_AUTOMATION_SCOPE)) {
      return jsonError("Admin automation scope requires admin role", 403);
    }
    const key = await createApiKeyUseCase(getAppServices(c), {
      userId: user.id,
      label: String(label ?? "Default key"),
      scopes
    });
    return c.json({ key }, 201);
  });

  app.delete("/api/api-keys/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json(await revokeApiKeyUseCase(getAppServices(c), { userId: user.id, keyId: c.req.param("id") }));
  });
}
