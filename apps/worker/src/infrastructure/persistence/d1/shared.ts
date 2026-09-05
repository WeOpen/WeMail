import { API_KEY_SCOPE_DEFINITIONS, DEFAULT_API_KEY_SCOPES, type ApiKeyScope } from "@wemail/shared";
import type { MailboxDetailListQuery } from "../../../core/bindings";

export function nowIso() {
  return new Date().toISOString();
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function getSafePage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

export function getSafePageSize(value: number) {
  if (!Number.isFinite(value) || value < 1) return 10;
  return Math.min(Math.trunc(value), 500);
}

export function getActiveRangeDays(value: MailboxDetailListQuery["activeRange"]) {
  switch (value) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return null;
  }
}

export function getInactiveDays(value: number | undefined) {
  return Number.isFinite(value) && value && value > 0 ? Math.trunc(value) : 30;
}

export function toBool(value: unknown) {
  return value === 1 || value === "1" || value === true;
}

export function parseJson<T>(value: string | null | undefined, fallback: T) {
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

export function parseAllowedRoles(value: string | null | undefined) {
  const roles = parseJson<unknown[]>(value, []);
  return roles.filter((role): role is "admin" | "member" => role === "admin" || role === "member");
}

export function parseApiKeyScopes(value: string | null | undefined) {
  const scopes = parseJson<unknown[]>(value, [...DEFAULT_API_KEY_SCOPES]);
  const normalized = scopes.filter((scope): scope is ApiKeyScope => typeof scope === "string" && apiKeyScopeIds.has(scope));
  return normalized.length > 0 ? normalized : [...DEFAULT_API_KEY_SCOPES];
}

const apiKeyScopeIds = new Set<string>(API_KEY_SCOPE_DEFINITIONS.map((scope) => scope.id));
