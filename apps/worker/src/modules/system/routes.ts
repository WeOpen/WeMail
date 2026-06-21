import type { Hono } from "hono";
import type { FeatureToggles, RuntimeSettingsUpdateInput } from "@wemail/shared";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { resolveAppConfig } from "../../core/config";
import { jsonError } from "../../app/services/audit-service";
import { CACHE_KEYS, CACHE_TTL_SECONDS, cachedJson, deleteCacheKeys } from "../../app/services/cache-service";
import { defaultFeatureToggles } from "../../app/services/config-service";
import { getRuntimeSettings, updateRuntimeSettings } from "../../app/services/runtime-settings-service";
import {
  getMailDomainSettingsUseCase,
  updateFeatureTogglesUseCase,
  updateMailDomainsUseCase
} from "../../app/use-cases/settings-use-cases";

export function registerSystemRoutes(app: Hono<AppContext>) {
  app.get("/api/system/health", (c) => {
    const config = resolveAppConfig(c.env);
    return c.json({
      ok: true,
      environment: config.environment,
      appName: config.appName,
      featureToggles: c.get("featureToggles") ?? defaultFeatureToggles(c.env)
    });
  });

  app.get("/api/system/features", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    return c.json({ featureToggles: c.get("featureToggles") });
  });

  app.patch("/api/system/features", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    const next = await updateFeatureTogglesUseCase(
      {
        ...getAppServices(c),
        currentFeatureToggles: c.get("featureToggles")
      },
      (await c.req.json()) as Partial<FeatureToggles>,
      user.id
    );
    return c.json({ featureToggles: next });
  });

  app.get("/api/system/domains", async (c) => {
    const user = requireUser(c);
    if (!user || !requireSessionAuth(c)) return jsonError("Session authentication required", 403);
    const payload = await cachedJson(c.env.CACHE, CACHE_KEYS.mailDomains, CACHE_TTL_SECONDS.systemDomains, () =>
      getMailDomainSettingsUseCase(getAppServices(c), c.env)
    );
    return c.json(payload);
  });

  app.patch("/api/system/domains", async (c) => {
    const user = requireUser(c);
    if (!user || !requireSessionAuth(c)) return jsonError("Session authentication required", 403);

    const result = await updateMailDomainsUseCase(getAppServices(c), await c.req.json(), user.id);
    if (result instanceof Response) return result;
    await deleteCacheKeys(c.env.CACHE, [CACHE_KEYS.mailDomains]);
    return c.json(result);
  });

  app.get("/api/system/runtime-settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const settings = await cachedJson(c.env.CACHE, CACHE_KEYS.runtimeSettings, CACHE_TTL_SECONDS.settings, () =>
      getRuntimeSettings(c.get("store"), c.env)
    );
    return c.json({ settings });
  });

  app.patch("/api/system/runtime-settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    let payload: RuntimeSettingsUpdateInput;
    try {
      payload = (await c.req.json()) as RuntimeSettingsUpdateInput;
    } catch {
      return jsonError("Invalid request", 400);
    }

    try {
      const settings = await updateRuntimeSettings(c.get("store"), c.env, payload);
      await deleteCacheKeys(c.env.CACHE, [CACHE_KEYS.runtimeSettings]);
      return c.json({ settings });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }
  });
}
