function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  const configuredBase = import.meta.env.VITE_API_BASE_URL;
  if (configuredBase) {
    return `${configuredBase}${path}`;
  }

  if (import.meta.env.DEV) {
    return `http://127.0.0.1:8787${path}`;
  }

  return path;
}

type ApiFetchOptions = RequestInit & {
  cacheKey?: string;
  cacheTtlMs?: number;
  dedupe?: boolean;
};

type ApiCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const inFlightGetRequests = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, ApiCacheEntry>();
const cacheKeyVersions = new Map<string, number>();
const requestKeyUrls = new Map<string, string>();
let globalCacheVersion = 0;

function resolveMethod(init?: RequestInit) {
  return (init?.method ?? "GET").toUpperCase();
}

function buildRequestKey(method: string, url: string, cacheKey?: string) {
  return cacheKey ?? `${method}:${url}`;
}

function toAbortError() {
  return Object.assign(new Error("Aborted"), { name: "AbortError" });
}

// Races a shared promise against the caller's own signal: the caller rejects
// promptly on its own abort while the shared request keeps running for the
// participants that still want it.
function raceWithSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(toAbortError());

  let onAbort: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    onAbort = () => reject(toAbortError());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  return Promise.race([promise, abortPromise]).finally(() => {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  });
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    // Propagate caller aborts so stale polling/refresh requests can be
    // cancelled on unmount or query change instead of running to completion.
    signal: init?.signal
  });

  if (response.ok && (response.status === 204 || response.status === 205)) return undefined as T;

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: `Request failed: ${response.status}` }))) as {
      error?: string;
    };
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;

  return JSON.parse(text) as T;
}

function getCacheVersion(key: string) {
  return `${globalCacheVersion}:${cacheKeyVersions.get(key) ?? 0}`;
}

function bumpCacheKeyVersion(key: string) {
  cacheKeyVersions.set(key, (cacheKeyVersions.get(key) ?? 0) + 1);
}

function matchesCachePath(key: string, pathPrefix: string, resolvedPrefix: string) {
  const url = requestKeyUrls.get(key) ?? "";
  return (
    key.includes(pathPrefix) ||
    key.includes(resolvedPrefix) ||
    url.includes(pathPrefix) ||
    url.includes(resolvedPrefix)
  );
}

export function invalidateApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    globalCacheVersion += 1;
    responseCache.clear();
    inFlightGetRequests.clear();
    requestKeyUrls.clear();
    return;
  }

  const resolvedPrefix = resolveApiUrl(pathPrefix);
  const invalidatedKeys = new Set<string>();
  for (const key of responseCache.keys()) {
    if (matchesCachePath(key, pathPrefix, resolvedPrefix)) {
      responseCache.delete(key);
      invalidatedKeys.add(key);
    }
  }
  for (const key of inFlightGetRequests.keys()) {
    if (matchesCachePath(key, pathPrefix, resolvedPrefix)) {
      inFlightGetRequests.delete(key);
      invalidatedKeys.add(key);
    }
  }
  for (const key of invalidatedKeys) {
    bumpCacheKeyVersion(key);
  }
}

export async function apiFetch<T>(path: string, init?: ApiFetchOptions) {
  const { cacheKey, cacheTtlMs = 0, dedupe = true, ...requestInit } = init ?? {};
  const method = resolveMethod(requestInit);
  const url = resolveApiUrl(path);
  const requestKey = buildRequestKey(method, url, cacheKey);
  const canReuseGet = method === "GET";
  requestKeyUrls.set(requestKey, url);

  if (canReuseGet && cacheTtlMs > 0) {
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) responseCache.delete(requestKey);
  }

  if (canReuseGet && dedupe) {
    const inFlightRequest = inFlightGetRequests.get(requestKey);
    if (inFlightRequest) {
      if (!requestInit.signal) return inFlightRequest as Promise<T>;
      // Joining a request other callers may abort for reasons that are not
      // ours: our own abort rejects immediately via the race, and a foreign
      // AbortError falls through so we issue our own request instead of
      // surfacing an error we did not cause.
      try {
        return await raceWithSignal(inFlightRequest as Promise<T>, requestInit.signal);
      } catch (error) {
        const isAbortError = error instanceof Error && error.name === "AbortError";
        if (!isAbortError || requestInit.signal.aborted) throw error;
      }
    }
  }

  const startedCacheVersion = getCacheVersion(requestKey);
  const request = fetchJson<T>(url, requestInit).then((value) => {
    if (canReuseGet && cacheTtlMs > 0 && getCacheVersion(requestKey) === startedCacheVersion) {
      responseCache.set(requestKey, {
        expiresAt: Date.now() + cacheTtlMs,
        value
      });
    }
    return value;
  });

  if (!canReuseGet || !dedupe) return request;

  inFlightGetRequests.set(requestKey, request);
  try {
    return await request;
  } finally {
    // Identity guard: a retried request may have replaced this entry while the
    // aborted original was unwinding; only remove our own.
    if (inFlightGetRequests.get(requestKey) === request) inFlightGetRequests.delete(requestKey);
  }
}
