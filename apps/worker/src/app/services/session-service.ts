import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { hashString, readSessionCookies } from "../../shared/auth";
import { CACHE_KEYS, CACHE_TTL_SECONDS, cachedJson } from "./cache-service";

export function sessionExpiryIso(env?: Pick<AppBindings, "SESSION_TTL_HOURS">) {
  const expires = new Date();
  const ttlHours = env ? resolveAppConfig(env as AppBindings).session.ttlHours : 72;
  expires.setHours(expires.getHours() + ttlHours);
  return expires.toISOString();
}

export async function getApiKeyAuth(c: any, store: AppStore) {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : c.req.header("x-api-key");
  if (!token) return null;
  const key = await store.apiKeys.findActiveByHash(await hashString(token));
  if (!key) return null;
  await store.apiKeys.touch(key.id);
  const user = await store.users.findById(key.userId);
  return user?.status === "active" ? { key, user } : null;
}

export function getRequestSessionMetadata(c: any) {
  return {
    userAgent: c.req?.header?.("user-agent") ?? null,
    ipAddress: c.req?.header?.("cf-connecting-ip") ?? c.req?.header?.("x-forwarded-for") ?? null
  };
}

export async function getSessionAuth(c: any, store: AppStore) {
  const tokens = readSessionCookies(c);
  for (const token of tokens) {
    const session = await store.sessions.findById(token);
    if (!session) continue;
    if (new Date(session.expiresAt) <= new Date()) {
      await store.sessions.delete(session.id);
      continue;
    }
    const user = await store.users.findById(session.userId);
    if (user?.status !== "active") continue;
    await store.sessions.touch(session.id, getRequestSessionMetadata(c));
    const refreshedSession = await store.sessions.findById(session.id);
    return { user, session: refreshedSession ?? session };
  }
  return null;
}

export async function resolveFeatureToggles(store: AppStore, env: AppBindings) {
  const { defaultFeatureToggles } = await import("./config-service");
  return cachedJson(env.CACHE, CACHE_KEYS.featureToggles, CACHE_TTL_SECONDS.featureToggles, () =>
    store.settings.getFeatureToggles(defaultFeatureToggles(env))
  );
}
