import type { AppBindings, AppStore } from "../../core/bindings";
import { getResolvedApiDailyLimit, getResolvedOutboundLimit } from "./config-service";
import { jsonError } from "./audit-service";

export async function refreshQuota(store: AppStore, env: AppBindings, userId: string) {
  const [outboundLimit, apiDailyLimit] = await Promise.all([
    getResolvedOutboundLimit(store, env),
    getResolvedApiDailyLimit(store, env)
  ]);
  const quota = await store.quotas.getByUserId(userId, outboundLimit, apiDailyLimit);
  const today = new Date().toISOString().slice(0, 10);
  if (quota.updatedAt.slice(0, 10) !== today) {
    quota.sendsToday = 0;
    quota.apiCallsToday = 0;
    quota.updatedAt = new Date().toISOString();
    await store.quotas.save(quota);
  }
  return quota;
}

export async function consumeApiCallQuota(store: AppStore, env: AppBindings, userId: string) {
  const [outboundLimit, apiDailyLimit] = await Promise.all([
    getResolvedOutboundLimit(store, env),
    getResolvedApiDailyLimit(store, env)
  ]);
  const quota = await store.quotas.consumeApiCall(userId, outboundLimit, apiDailyLimit);
  if (!quota) {
    return jsonError("API daily call limit exceeded", 429);
  }
  return quota;
}
