import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiKeyScope } from "@wemail/shared";

import { registerMenuModules } from "../modules/register-modules";
import { resolveAppConfig } from "../core/config";
import type { AppContext } from "./context";
import { jsonError } from "./services/audit-service";
import { consumeApiCallQuota } from "./services/quota-service";
import { getApiKeyAuth, getSessionAuth, resolveFeatureToggles } from "./services/session-service";
import { resolveStore } from "./services/store-service";
import { processInboundEmail, runCleanup } from "./runtime";

function resolveCorsOrigin(env: AppContext["Bindings"], origin?: string) {
  if (!origin) return undefined;
  if (origin === "http://127.0.0.1:5173" || origin === "http://localhost:5173") {
    return origin;
  }
  const { allowedOrigins } = resolveAppConfig(env).cors;
  return allowedOrigins.includes(origin) ? origin : undefined;
}

function resolveApiKeyScopeRequirement(method: string, path: string): ApiKeyScope | null {
  if (path === "/api/system/health" || path.startsWith("/api/auth/")) return null;
  if (path === "/api/mail/settings") return "settings:read";
  if (path === "/api/mail/send" || path.startsWith("/api/mail/outbound")) return "mail:send";
  if (path.startsWith("/api/mail")) return "mail:read";
  if (path.startsWith("/api/accounts")) return method === "GET" ? "mail:read" : "mailbox:manage";
  if (path.startsWith("/api/webhook") || path.startsWith("/api/telegram") || path.startsWith("/api/notification")) return "webhook:manage";
  if (path.startsWith("/api/api-keys") || path.startsWith("/api/dictionaries") || path === "/api/system/domains") {
    return "settings:read";
  }
  if (path.startsWith("/api/users") || path.startsWith("/api/system/") || path.startsWith("/api/announcements")) {
    return "admin:automation";
  }
  return null;
}

export function createApp(options?: { store?: AppContext["Variables"]["store"] }) {
  const app = new Hono<AppContext>();
  app.use(
    "*",
    cors({
      origin: (origin, c) => resolveCorsOrigin(c.env, origin),
      credentials: true
    })
  );

  app.use("*", async (c, next) => {
    const store = await resolveStore(c.env, options?.store);
    const featureToggles = await resolveFeatureToggles(store, c.env);
    const sessionAuth = await getSessionAuth(c, store);
    const sessionUser = sessionAuth?.user ?? null;
    const apiKeyAuth = sessionUser ? null : await getApiKeyAuth(c, store);

    c.set("store", store);
    c.set("featureToggles", featureToggles);
    c.set("user", sessionUser ?? apiKeyAuth?.user ?? null);
    c.set("authMode", sessionUser ? "session" : apiKeyAuth ? "apiKey" : "anonymous");
    c.set("sessionId", sessionAuth?.session.id ?? null);
    c.set("apiKeyScopes", apiKeyAuth?.key.scopes ?? []);

    if (apiKeyAuth) {
      const requiredScope = resolveApiKeyScopeRequirement(c.req.method, c.req.path);
      if (requiredScope && !apiKeyAuth.key.scopes.includes(requiredScope)) {
        return jsonError(`API key missing required scope: ${requiredScope}`, 403);
      }

      const quota = await consumeApiCallQuota(store, c.env, apiKeyAuth.user.id);
      if (quota instanceof Response) return quota;
    }

    if (c.env.RATE_LIMITER) {
      const ip = c.req.header("cf-connecting-ip") ?? "local";
      const limited = [
        "/api/auth/register",
        "/api/auth/login",
        "/api/accounts",
        "/api/mail/send",
        "/api/api-keys"
      ].includes(c.req.path);
      if (limited) {
        const result = await c.env.RATE_LIMITER.limit({ key: `${c.req.path}:${ip}` });
        if (!result.success) return jsonError("Rate limit exceeded", 429);
      }
    }

    return next();
  });

  registerMenuModules(app);

  return app;
}

export { processInboundEmail, runCleanup };
