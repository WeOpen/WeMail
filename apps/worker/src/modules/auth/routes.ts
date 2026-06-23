import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { isOAuthProviderId } from "../../app/services/oauth-provider-service";
import { toSessionResponse } from "../../app/routes/dto/auth-dto";
import { parseLoginRequest, parseOAuthFinalizeRequest, parseRegisterRequest } from "../../app/routes/requests/auth-request";
import { clearSessionCookie } from "../../shared/auth";
import {
  finalizeOAuthLogin,
  handleOAuthCallback,
  loginUser,
  logoutUser,
  registerUserWithInvite,
  startOAuthLogin
} from "../../app/use-cases/auth-use-cases";

export function registerAuthRoutes(app: Hono<AppContext>) {
  app.post("/api/auth/register", async (c) => {
    const { email, name, password, inviteCode } = await parseRegisterRequest(c.req.raw);
    const result = await registerUserWithInvite(
      {
        store: c.get("store"),
        featureToggles: c.var.featureToggles,
        env: c.env
      },
      { email, name, password, inviteCode },
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

  app.get("/api/auth/oauth/:provider/start", async (c) => {
    const provider = c.req.param("provider");
    if (!isOAuthProviderId(provider)) return jsonError("OAuth provider not found", 404);
    const url = new URL(c.req.url);
    return startOAuthLogin(
      {
        store: c.get("store"),
        featureToggles: c.var.featureToggles,
        env: c.env,
        rawContext: c,
        redirect: (location) => c.redirect(location)
      },
      provider,
      url.searchParams.get("next")
    );
  });

  app.get("/api/auth/oauth/:provider/callback", async (c) => {
    const provider = c.req.param("provider");
    if (!isOAuthProviderId(provider)) return jsonError("OAuth provider not found", 404);
    const url = new URL(c.req.url);
    return handleOAuthCallback(
      {
        store: c.get("store"),
        featureToggles: c.var.featureToggles,
        env: c.env,
        rawContext: c,
        redirect: (location) => c.redirect(location)
      },
      provider,
      url.searchParams.get("code"),
      url.searchParams.get("state")
    );
  });

  app.post("/api/auth/oauth/:provider/finalize", async (c) => {
    const provider = c.req.param("provider");
    if (!isOAuthProviderId(provider)) return jsonError("OAuth provider not found", 404);
    const payload = await parseOAuthFinalizeRequest(c.req.raw);
    const result = await finalizeOAuthLogin(
      {
        store: c.get("store"),
        featureToggles: c.var.featureToggles,
        env: c.env,
        rawContext: c,
        redirect: (location) => c.redirect(location)
      },
      provider,
      payload
    );
    if (result instanceof Response) return result;
    return c.json(result);
  });

  app.get("/api/auth/session", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Not authenticated", 401);
    const fullUser = await c.get("store").users.findById(user.id);
    if (!fullUser) return jsonError("User not found", 404);
    return c.json(toSessionResponse(fullUser, c.var.featureToggles));
  });
}
