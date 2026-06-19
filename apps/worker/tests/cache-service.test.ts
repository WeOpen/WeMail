import { describe, expect, it, vi } from "vitest";

import { cachedJson, deleteCacheKeys } from "../src/app/services/cache-service";

function createMockKv(initialValues: Record<string, unknown> = {}) {
  const values = new Map(Object.entries(initialValues).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    delete: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    get: vi.fn(async (key: string, type?: "json" | "text") => {
      const value = values.get(key) ?? null;
      if (type === "json" && value) return JSON.parse(value) as unknown;
      return value;
    }),
    put: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    })
  };
}

describe("cache service", () => {
  it("falls back to the loader when KV is unavailable", async () => {
    const loader = vi.fn(async () => ({ ok: true }));

    const result = await cachedJson(undefined, "v1:test", 60, loader);

    expect(result).toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reads cached JSON values and writes loader results with ttl", async () => {
    const kv = createMockKv({ "v1:hit": { cached: true } });
    const hitLoader = vi.fn(async () => ({ cached: false }));
    const missLoader = vi.fn(async () => ({ cached: false }));

    await expect(cachedJson(kv as never, "v1:hit", 120, hitLoader)).resolves.toEqual({ cached: true });
    await expect(cachedJson(kv as never, "v1:miss", 120, missLoader)).resolves.toEqual({ cached: false });

    expect(hitLoader).not.toHaveBeenCalled();
    expect(missLoader).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledWith("v1:miss", JSON.stringify({ cached: false }), { expirationTtl: 120 });
  });

  it("deletes multiple cache keys when a write invalidates cached data", async () => {
    const kv = createMockKv({
      "v1:first": { ok: true },
      "v1:second": { ok: true }
    });

    await deleteCacheKeys(kv as never, ["v1:first", "v1:second"]);

    expect(kv.delete).toHaveBeenCalledWith("v1:first");
    expect(kv.delete).toHaveBeenCalledWith("v1:second");
  });
});
