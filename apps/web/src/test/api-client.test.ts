import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, invalidateApiCache } from "../shared/api/client";
import { jsonResponse } from "./helpers/mock-api";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the worker origin for auth requests during local development", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ ok: true }));

    await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({}) });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/auth/register",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("deduplicates concurrent GET requests for the same URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ ok: true }));

    const [firstPayload, secondPayload] = await Promise.all([
      apiFetch<{ ok: boolean }>("/api/system/features"),
      apiFetch<{ ok: boolean }>("/api/system/features")
    ]);

    expect(firstPayload).toEqual({ ok: true });
    expect(secondPayload).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps short-lived GET cache entries until explicitly invalidated", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => jsonResponse({ version: 1 }))
      .mockImplementationOnce(() => jsonResponse({ version: 2 }));

    const firstPayload = await apiFetch<{ version: number }>("/api/system/runtime-settings", { cacheTtlMs: 1_000 });
    const cachedPayload = await apiFetch<{ version: number }>("/api/system/runtime-settings", { cacheTtlMs: 1_000 });

    invalidateApiCache("/api/system/runtime-settings");
    const refreshedPayload = await apiFetch<{ version: number }>("/api/system/runtime-settings", { cacheTtlMs: 1_000 });

    expect(firstPayload).toEqual({ version: 1 });
    expect(cachedPayload).toEqual({ version: 1 });
    expect(refreshedPayload).toEqual({ version: 2 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("clears in-flight GET dedupe entries when invalidating the cache", async () => {
    let resolveFirstResponse: (response: Response) => void = () => {};
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirstResponse = resolve;
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => jsonResponse({ version: 2 }));

    const firstPayload = apiFetch<{ version: number }>("/api/system/runtime-settings");

    invalidateApiCache();
    const refreshedPayload = apiFetch<{ version: number }>("/api/system/runtime-settings");
    resolveFirstResponse(await jsonResponse({ version: 1 }));

    await expect(firstPayload).resolves.toEqual({ version: 1 });
    await expect(refreshedPayload).resolves.toEqual({ version: 2 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not let invalidated in-flight GET responses overwrite fresh cache entries", async () => {
    let resolveFirstResponse: (response: Response) => void = () => {};
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirstResponse = resolve;
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => jsonResponse({ version: 2 }));

    const firstPayload = apiFetch<{ version: number }>("/api/system/runtime-settings", {
      cacheKey: "runtime-settings",
      cacheTtlMs: 1_000
    });

    invalidateApiCache("/api/system/runtime-settings");
    const refreshedPayload = await apiFetch<{ version: number }>("/api/system/runtime-settings", {
      cacheKey: "runtime-settings",
      cacheTtlMs: 1_000
    });
    resolveFirstResponse(await jsonResponse({ version: 1 }));

    await expect(firstPayload).resolves.toEqual({ version: 1 });
    expect(refreshedPayload).toEqual({ version: 2 });
    await expect(
      apiFetch<{ version: number }>("/api/system/runtime-settings", {
        cacheKey: "runtime-settings",
        cacheTtlMs: 1_000
      })
    ).resolves.toEqual({ version: 2 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("treats successful empty responses as void payloads", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch<void>("/api/announcements/ann-1", { method: "DELETE" })).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
