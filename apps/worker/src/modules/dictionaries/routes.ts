import type { Hono } from "hono";
import type { DictionaryItemUpdateInput } from "@wemail/shared";

import type { AppContext } from "../../app/context";
import { requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import { CACHE_KEYS, CACHE_TTL_SECONDS, cachedJson, deleteCacheKeys } from "../../app/services/cache-service";

function parseGroupKeys(value: string | undefined) {
  return value
    ?.split(",")
    .map((groupKey) => groupKey.trim())
    .filter(Boolean);
}

function getDictionaryCacheKey(scope: "admin" | "visible", groupKeys: string[]) {
  if (groupKeys.length > 1) return null;
  return CACHE_KEYS.dictionaryCatalog(scope, groupKeys);
}

function decodeRouteParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDictionaryItemUpdate(input: unknown): DictionaryItemUpdateInput {
  if (!isRecordLike(input)) throw new Error("payload must be an object");
  const result: DictionaryItemUpdateInput = {};

  if (typeof input.label !== "undefined") {
    if (typeof input.label !== "string" || input.label.trim().length === 0) {
      throw new Error("label is required");
    }
    result.label = input.label.trim();
  }

  if (typeof input.description !== "undefined") {
    if (input.description !== null && typeof input.description !== "string") {
      throw new Error("description must be a string or null");
    }
    result.description = input.description?.trim() || null;
  }

  if (typeof input.sortOrder !== "undefined") {
    if (typeof input.sortOrder !== "number" || !Number.isFinite(input.sortOrder)) {
      throw new Error("sortOrder must be a number");
    }
    result.sortOrder = Math.trunc(input.sortOrder);
  }

  if (typeof input.enabled !== "undefined") {
    if (typeof input.enabled !== "boolean") throw new Error("enabled must be a boolean");
    result.enabled = input.enabled;
  }

  if (typeof input.metadata !== "undefined") {
    if (!isRecordLike(input.metadata)) throw new Error("metadata must be an object");
    result.metadata = input.metadata;
  }

  if (Object.keys(result).length === 0) {
    throw new Error("label, description, sortOrder, enabled, or metadata is required");
  }

  return result;
}

export function registerDictionariesRoutes(app: Hono<AppContext>) {
  app.get("/api/dictionaries", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const includeDisabled = user.role === "admin" && c.req.query("includeDisabled") === "true";
    const groupKeys = parseGroupKeys(c.req.query("groups")) ?? [];
    const cacheKey = getDictionaryCacheKey(includeDisabled ? "admin" : "visible", groupKeys);
    const dictionaries = cacheKey
      ? await cachedJson(c.env.CACHE, cacheKey, CACHE_TTL_SECONDS.dictionaries, () =>
          c.get("store").dictionaries.listGroups(groupKeys.length > 0 ? groupKeys : undefined, {
            includeDisabled
          })
        )
      : await c.get("store").dictionaries.listGroups(groupKeys, { includeDisabled });
    return c.json({ dictionaries });
  });

  app.patch("/api/dictionaries/:groupKey/items/:value", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    let payload: DictionaryItemUpdateInput;
    try {
      payload = parseDictionaryItemUpdate(await c.req.json());
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const groupKey = decodeRouteParam(c.req.param("groupKey"));
    const value = decodeRouteParam(c.req.param("value"));
    const item = await c.get("store").dictionaries.updateItem(groupKey, value, payload);
    if (!item) return jsonError("Dictionary item not found", 404);

    await recordAudit(c.get("store"), "user", user.id, "dictionary-item-update", {
      groupKey,
      value,
      update: payload
    });
    await deleteCacheKeys(c.env.CACHE, [
      CACHE_KEYS.dictionaryCatalog("visible", []),
      CACHE_KEYS.dictionaryCatalog("admin", []),
      CACHE_KEYS.dictionaryCatalog("visible", [groupKey]),
      CACHE_KEYS.dictionaryCatalog("admin", [groupKey])
    ]);
    return c.json({ item });
  });
}
