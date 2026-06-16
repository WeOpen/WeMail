import type { AppBindings, AppStore } from "../../core/bindings";
import { getApiDailyLimit, getOutboundLimit } from "./config-service";
import { jsonError } from "./audit-service";

export async function refreshQuota(store: AppStore, env: AppBindings, userId: string) {
  const quota = await store.quotas.getByUserId(userId, getOutboundLimit(env), getApiDailyLimit(env));
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
  const quota = await store.quotas.consumeApiCall(userId, getOutboundLimit(env), getApiDailyLimit(env));
  if (!quota) {
    return jsonError("API daily call limit exceeded", 429);
  }
  return quota;
}
