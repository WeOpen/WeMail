import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { parseUserProfileUpdateRequest } from "../../app/routes/requests/profile-request";
import { jsonError } from "../../app/services/audit-service";
import {
  getUserProfileUseCase,
  listCurrentUserSessionsUseCase,
  revokeCurrentUserSessionUseCase,
  revokeOtherCurrentUserSessionsUseCase,
  updateCurrentUserProfileUseCase
} from "../../app/use-cases/profile-use-cases";

function requireProfileSession(c: { get: <T>(key: string) => T }) {
  const user = requireUser(c);
  if (!user || !requireSessionAuth(c)) return null;
  return user;
}

export function registerProfileRoutes(app: Hono<AppContext>) {
  app.get("/api/profile", async (c) => {
    const user = requireProfileSession(c);
    if (!user) return jsonError("Not authenticated", 401);

    const result = await getUserProfileUseCase(getAppServices(c), user.id);
    if (result instanceof Response) return result;
    return c.json({ profile: result });
  });

  app.patch("/api/profile", async (c) => {
    const user = requireProfileSession(c);
    if (!user) return jsonError("Not authenticated", 401);

    const payload = await parseUserProfileUpdateRequest(c.req.raw);
    const result = await updateCurrentUserProfileUseCase(getAppServices(c), {
      actorUserId: user.id,
      ...payload
    });
    if (result instanceof Response) return result;
    return c.json({ profile: result });
  });

  app.get("/api/profile/sessions", async (c) => {
    const user = requireProfileSession(c);
    if (!user) return jsonError("Not authenticated", 401);

    return c.json({
      sessions: await listCurrentUserSessionsUseCase(getAppServices(c), {
        actorUserId: user.id,
        currentSessionId: c.get("sessionId")
      })
    });
  });

  app.delete("/api/profile/sessions/others", async (c) => {
    const user = requireProfileSession(c);
    const currentSessionId = c.get("sessionId");
    if (!user || !currentSessionId) return jsonError("Not authenticated", 401);

    const result = await revokeOtherCurrentUserSessionsUseCase(getAppServices(c), {
      actorUserId: user.id,
      currentSessionId
    });
    return c.json(result);
  });

  app.delete("/api/profile/sessions/:sessionId", async (c) => {
    const user = requireProfileSession(c);
    if (!user) return jsonError("Not authenticated", 401);

    const result = await revokeCurrentUserSessionUseCase(getAppServices(c), {
      actorUserId: user.id,
      currentSessionId: c.get("sessionId"),
      sessionId: c.req.param("sessionId")
    });
    if (result instanceof Response) return result;
    return c.json(result);
  });
}
