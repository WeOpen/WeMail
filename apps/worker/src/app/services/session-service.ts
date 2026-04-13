import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { hashString, readSessionCookie } from "../../shared/auth";

export function sessionExpiryIso(env?: Pick<AppBindings, "SESSION_TTL_HOURS">) {
  const expires = new Date();
  const ttlHours = env ? resolveAppConfig(env as AppBindings).session.ttlHours : 72;
  expires.setHours(expires.getHours() + ttlHours);
  return expires.toISOString();
}

export async function getUserFromApiKey(c: any, store: AppStore) {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : c.req.header("x-api-key");
  if (!token) return null;
  const key = await store.apiKeys.findActiveByHash(await hashString(token));
  if (!key) return null;
  await store.apiKeys.touch(key.id);
  return store.users.findById(key.userId);
}

export async function getUserFromSession(c: any, store: AppStore) {
  const token = readSessionCookie(c);
  if (!token) return null;
  const session = await store.sessions.findById(token);
  if (!session) return null;
  if (new Date(session.expiresAt) <= new Date()) {
    await store.sessions.delete(session.id);
    return null;
  }
  return store.users.findById(session.userId);
}

export async function resolveFeatureToggles(store: AppStore, env: AppBindings) {
  const { defaultFeatureToggles } = await import("./config-service");
  return store.settings.getFeatureToggles(defaultFeatureToggles(env));
}
