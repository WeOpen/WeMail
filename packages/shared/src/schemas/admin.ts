import { requireBoolean, requireNumber, requireString, toRecordLike } from "../validators";
import type { UserRole } from "../types";

function requireUserRole(value: unknown): UserRole {
  if (value !== "admin" && value !== "member") {
    throw new Error("role must be admin or member");
  }
  return value;
}

export function parseQuotaPayload(input: unknown, fallback: { dailyLimit: number; disabled: boolean }) {
  const payload = toRecordLike(input);
  return {
    dailyLimit:
      typeof payload.dailyLimit === "undefined"
        ? fallback.dailyLimit
        : requireNumber(payload.dailyLimit, "dailyLimit"),
    disabled:
      typeof payload.disabled === "undefined"
        ? fallback.disabled
        : requireBoolean(payload.disabled)
  };
}

export function parseUserCreatePayload(input: unknown) {
  const payload = toRecordLike(input);
  return {
    email: requireString(payload.email, "email").toLowerCase(),
    password: requireString(payload.password, "password"),
    role: requireUserRole(payload.role ?? "member")
  };
}

export function parseUserRoleUpdatePayload(input: unknown) {
  const payload = toRecordLike(input);
  return {
    role: requireUserRole(payload.role)
  };
}
