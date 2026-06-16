import { Hono } from "hono";
import { cors } from "hono/cors";

import { registerMenuModules } from "../modules/register-modules";
import { resolveAppConfig } from "../core/config";
import type { AppContext } from "./context";
import { jsonError } from "./services/audit-service";
import { consumeApiCallQuota } from "./services/quota-service";
import { getUserFromApiKey, getUserFromSession, resolveFeatureToggles } from "./services/session-service";
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
    const sessionUser = await getUserFromSession(c, store);
    const apiKeyUser = sessionUser ? null : await getUserFromApiKey(c, store);

    c.set("store", store);
    c.set("featureToggles", featureToggles);
    c.set("user", sessionUser ?? apiKeyUser);
    c.set("authMode", sessionUser ? "session" : apiKeyUser ? "apiKey" : "anonymous");

    if (apiKeyUser) {
      const quota = await consumeApiCallQuota(store, c.env, apiKeyUser.id);
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
