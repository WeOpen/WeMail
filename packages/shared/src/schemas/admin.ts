import { requireBoolean, requireNumber, requireString, toRecordLike } from "../validators";
import type { InviteCreateInput, UserRole, UserStatus } from "../types";

function resolveUserName(value: unknown, email: string) {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return email.split("@")[0] || email;
}

function requireUserRole(value: unknown): UserRole {
  if (value !== "admin" && value !== "member") {
    throw new Error("role must be admin or member");
  }
  return value;
}

function requireUserStatus(value: unknown): UserStatus {
  if (value !== "active" && value !== "disabled") {
    throw new Error("status must be active or disabled");
  }
  return value;
}

function requirePassword(value: unknown) {
  const password = requireString(value, "password");
  if (password.length < 8) throw new Error("password must be at least 8 characters");
  return password;
}

export function parseQuotaPayload(input: unknown, fallback: { apiDailyLimit: number; dailyLimit: number; disabled: boolean }) {
  const payload = toRecordLike(input);
  return {
    apiDailyLimit:
      typeof payload.apiDailyLimit === "undefined"
        ? fallback.apiDailyLimit
        : requireNumber(payload.apiDailyLimit, "apiDailyLimit"),
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
  const email = requireString(payload.email, "email").toLowerCase();
  return {
    email,
    name: resolveUserName(payload.name, email),
    password: requirePassword(payload.password),
    role: requireUserRole(payload.role ?? "member")
  };
}

export function parseUserUpdatePayload(input: unknown) {
  const payload = toRecordLike(input);
  const result: { name?: string; role?: UserRole } = {};
  if (typeof payload.name !== "undefined") result.name = requireString(payload.name, "name");
  if (typeof payload.role !== "undefined") result.role = requireUserRole(payload.role);
  if (typeof result.name === "undefined" && typeof result.role === "undefined") {
    throw new Error("name or role is required");
  }
  return result;
}

export function parseUserRoleUpdatePayload(input: unknown) {
  return { role: parseUserUpdatePayload(input).role ?? requireUserRole(undefined) };
}

export function parseUserStatusUpdatePayload(input: unknown) {
  const payload = toRecordLike(input);
  return {
    status: requireUserStatus(payload.status)
  };
}

export function parseUserPasswordResetPayload(input: unknown) {
  const payload = toRecordLike(input);
  return { password: requirePassword(payload.password) };
}

export function parseInviteCreatePayload(input: unknown): Required<InviteCreateInput> {
  const payload = toRecordLike(input ?? {});
  const count = typeof payload.count === "undefined" ? 1 : requireNumber(payload.count, "count");
  const maxRedemptions =
    typeof payload.maxRedemptions === "undefined" ? 1 : requireNumber(payload.maxRedemptions, "maxRedemptions");
  const targetRole = requireUserRole(payload.targetRole ?? "member");
  const expiresInDays =
    typeof payload.expiresInDays === "undefined" || payload.expiresInDays === null
      ? null
      : requireNumber(payload.expiresInDays, "expiresInDays");

  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new Error("count must be an integer between 1 and 50");
  }

  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100) {
    throw new Error("maxRedemptions must be an integer between 1 and 100");
  }

  if (expiresInDays !== null && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365)) {
    throw new Error("expiresInDays must be an integer between 1 and 365");
  }

  return {
    count,
    targetRole,
    expiresInDays,
    maxRedemptions
  };
}
