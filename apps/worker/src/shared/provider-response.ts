export function readRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) && delay >= 0 ? Math.min(delay, 3_600_000) : undefined;
}

export async function readProviderBody(response: Response, maxBytes = 16_384) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (bytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - bytes;
      text += decoder.decode(value.subarray(0, remaining), { stream: true });
      bytes += Math.min(value.byteLength, remaining);
      if (value.byteLength >= remaining) { await reader.cancel(); break; }
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
