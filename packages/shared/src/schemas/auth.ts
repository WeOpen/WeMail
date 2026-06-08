import { requireString, toRecordLike } from "../validators";

function resolveUserName(value: unknown, email: string) {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return email.split("@")[0] || email;
}

export function parseRegisterPayload(input: unknown) {
  const payload = toRecordLike(input);
  const email = requireString(payload.email, "email");
  return {
    email,
    name: resolveUserName(payload.name, email),
    password: requireString(payload.password, "password"),
    inviteCode: requireString(payload.inviteCode, "inviteCode")
  };
}

export function parseLoginPayload(input: unknown) {
  const payload = toRecordLike(input);
  return {
    email: requireString(payload.email, "email"),
    password: requireString(payload.password, "password")
  };
}
