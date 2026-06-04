import { Hono } from "hono";
import { cors } from "hono/cors";

import { registerMenuModules } from "../modules/register-modules";
import type { AppContext } from "./context";
import { jsonError } from "./services/audit-service";
import { getUserFromApiKey, getUserFromSession, resolveFeatureToggles } from "./services/session-service";
import { resolveStore } from "./services/store-service";
import { processInboundEmail, runCleanup } from "./runtime";

function resolveCorsOrigin(origin?: string) {
  if (!origin) return "*";
  if (origin === "http://127.0.0.1:5173" || origin === "http://localhost:5173") {
    return origin;
  }
  return "*";
}

export function createApp(options?: { store?: AppContext["Variables"]["store"] }) {
  const app = new Hono<AppContext>();
  app.use(
    "*",
    cors({
      origin: (origin) => resolveCorsOrigin(origin),
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
