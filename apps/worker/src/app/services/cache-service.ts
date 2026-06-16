export const CACHE_KEYS = {
  accountPolicy: "v1:settings:account-policy",
  dictionaryCatalog: (scope: "admin" | "visible", groups: string[]) =>
    `v1:dict:catalog:${scope}:${groups.length > 0 ? groups.join(",") : "all"}`,
  featureToggles: "v1:system:features",
  mailDomains: "v1:system:domains",
  mailSettings: "v1:settings:mail"
} as const;

export const CACHE_TTL_SECONDS = {
  dictionaries: 300,
  featureToggles: 60,
  settings: 120,
  systemDomains: 300
} as const;

export async function cachedJson<T>(
  cache: KVNamespace | undefined,
  key: string,
  ttlSeconds: number,
  loadValue: () => Promise<T>
): Promise<T> {
  if (!cache) return loadValue();

  try {
    const cached = await cache.get<T>(key, "json");
    if (cached !== null) return cached;
  } catch {
    return loadValue();
  }

  const value = await loadValue();

  try {
    await cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  } catch {
    // KV is a best-effort cache; D1 remains the source of truth.
  }

  return value;
}

export async function deleteCacheKeys(cache: KVNamespace | undefined, keys: string[]) {
  if (!cache) return;

  await Promise.all(
    keys.map(async (key) => {
      try {
        await cache.delete(key);
      } catch {
        // Cache invalidation should not make the write path fail.
      }
    })
  );
}
