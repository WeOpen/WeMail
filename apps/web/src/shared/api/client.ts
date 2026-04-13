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

export async function apiFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(resolveApiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: `Request failed: ${response.status}` }))) as {
      error?: string;
    };
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
