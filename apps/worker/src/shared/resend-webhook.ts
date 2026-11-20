function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export async function verifyResendWebhook(rawBody: string, headers: Headers, secret: string | undefined, nowMs = Date.now()) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!secret?.startsWith("whsec_") || !id || !timestamp || !signatures) return false;
  if (id.length > 256 || signatures.length > 2048 || !/^\d{1,12}$/.test(timestamp)) return false;
  // Check the delivery-attempt timestamp, rather than the event's creation
  // time: legitimate provider replays can concern an older mail event.
  if (!Number.isFinite(nowMs) || Math.abs(nowMs / 1000 - Number(timestamp)) > 300) return false;
  try {
    const key = await crypto.subtle.importKey("raw", decodeBase64(secret.slice(6)), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    // JSON parsing or re-serialization would change the signed bytes. Verify
    // before interpreting the payload, using Web Crypto's signature check.
    const content = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`);
    for (const candidate of signatures.split(/\s+/)) {
      const [version, signature] = candidate.split(",");
      if (version !== "v1" || !signature) continue;
      try {
        if (await crypto.subtle.verify("HMAC", key, decodeBase64(signature), content)) return true;
      } catch { /* A malformed rotation candidate does not invalidate other signatures. */ }
    }
  } catch { return false; }
  return false;
}
