import { requireString, toRecordLike } from "../validators";

function resolveUserName(value: unknown, email: string) {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return email.split("@")[0] || email;
}

export function parseRegisterPayload(input: unknown) {
  const payload = toRecordLike(input);
  const email = requireString(payload.email, "email");
  const inviteCode = typeof payload.inviteCode === "string" && payload.inviteCode.trim().length > 0 ? payload.inviteCode.trim() : null;
  return {
    email,
    name: resolveUserName(payload.name, email),
    password: requireString(payload.password, "password"),
    inviteCode
  };
}

export function parseLoginPayload(input: unknown) {
  const payload = toRecordLike(input);
  return {
    email: requireString(payload.email, "email"),
    password: requireString(payload.password, "password")
  };
}
