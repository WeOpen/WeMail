import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { toSessionResponse } from "../../app/routes/dto/auth-dto";
import { parseLoginRequest, parseRegisterRequest } from "../../app/routes/requests/auth-request";
import { clearSessionCookie } from "../../shared/auth";
import { loginUser, logoutUser, registerUserWithInvite } from "../../app/use-cases/auth-use-cases";

export function registerAuthRoutes(app: Hono<AppContext>) {
  app.post("/api/auth/register", async (c) => {
    const { email, password, inviteCode } = await parseRegisterRequest(c.req.raw);
    const result = await registerUserWithInvite(
      {
        store: c.get("store"),
        featureToggles: c.var.featureToggles,
        env: c.env
      },
      { email, password, inviteCode },
      c
    );
    if (result instanceof Response) return result;
    return c.json(result, 201);
  });

  app.post("/api/auth/login", async (c) => {
    const { email, password } = await parseLoginRequest(c.req.raw);
    const result = await loginUser(
      {
        store: c.get("store"),
        featureToggles: c.var.featureToggles,
        env: c.env
      },
      { email, password },
      c
    );
    if (result instanceof Response) return result;
    return c.json(result);
  });

  app.post("/api/auth/logout", async (c) => {
    await logoutUser({ store: c.get("store") }, c);
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  app.get("/api/auth/session", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Not authenticated", 401);
    const fullUser = await c.get("store").users.findById(user.id);
    if (!fullUser) return jsonError("User not found", 404);
    return c.json(
      toSessionResponse(
        { id: fullUser.id, email: fullUser.email, role: fullUser.role, createdAt: fullUser.createdAt },
        c.var.featureToggles
      )
    );
  });
}
