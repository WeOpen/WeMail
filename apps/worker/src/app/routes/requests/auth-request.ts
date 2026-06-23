import { parseLoginPayload, parseRegisterPayload } from "@wemail/shared";

export async function parseRegisterRequest(request: Request) {
  return parseRegisterPayload(await request.json());
}

export async function parseLoginRequest(request: Request) {
  return parseLoginPayload(await request.json());
}

function toRecordLike(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid request body");
  return input as Record<string, unknown>;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} is required`);
  return value.trim();
}

export async function parseOAuthFinalizeRequest(request: Request) {
  const payload = toRecordLike(await request.json());
  const inviteCode = typeof payload.inviteCode === "string" && payload.inviteCode.trim().length > 0 ? payload.inviteCode.trim() : null;
  return {
    ticket: requireString(payload.ticket, "ticket"),
    inviteCode
  };
}
