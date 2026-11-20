import { parseOutboundPayload } from "@wemail/shared";

export async function parseOutboundSendRequest(request: Request) {
  const payload = await request.json() as Record<string, unknown>;
  const requestId = request.headers.get("idempotency-key");
  return parseOutboundPayload({ ...payload, ...(requestId ? { requestId } : {}) });
}
