import {
  parseQuotaPayload,
  parseUserCreatePayload,
  parseUserPasswordResetPayload,
  parseUserRoleUpdatePayload,
  parseUserStatusUpdatePayload,
  parseUserUpdatePayload
} from "@wemail/shared";
import type { UserRole, UserStatus } from "@wemail/shared";

const USER_PAGE_SIZE_OPTIONS = new Set([10, 20, 50]);
const SETTINGS_PAGE_SIZE_OPTIONS = new Set([5, 10, 20, 50]);

function parsePositiveInt(value: string | null, fallback: number) {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : fallback;
}

function parseUserRoleFilter(value: string | null): UserRole | undefined {
  return value === "admin" || value === "member" ? value : undefined;
}

function parseUserStatusFilter(value: string | null): UserStatus | undefined {
  return value === "active" || value === "disabled" ? value : undefined;
}

export function parseUserListQuery(url: string) {
  const params = new URL(url).searchParams;
  const page = parsePositiveInt(params.get("page"), 1);
  const requestedPageSize = parsePositiveInt(params.get("pageSize"), 10);
  const search = (params.get("search") ?? "").trim();

  return {
    page,
    pageSize: USER_PAGE_SIZE_OPTIONS.has(requestedPageSize) ? requestedPageSize : 10,
    search: search.length > 0 ? search : undefined,
    role: parseUserRoleFilter(params.get("role")),
    status: parseUserStatusFilter(params.get("status"))
  };
}

export function parseSettingsListQuery(url: string) {
  const params = new URL(url).searchParams;
  const page = parsePositiveInt(params.get("page"), 1);
  const requestedPageSize = parsePositiveInt(params.get("pageSize"), 5);

  return {
    page,
    pageSize: SETTINGS_PAGE_SIZE_OPTIONS.has(requestedPageSize) ? requestedPageSize : 5
  };
}

export async function parseQuotaUpdateRequest(
  request: Request,
  fallback: { dailyLimit: number; disabled: boolean }
) {
  return parseQuotaPayload(await request.json(), fallback);
}

export async function parseUserCreateRequest(request: Request) {
  return parseUserCreatePayload(await request.json());
}

export async function parseUserRoleUpdateRequest(request: Request) {
  return parseUserRoleUpdatePayload(await request.json());
}

export async function parseUserUpdateRequest(request: Request) {
  return parseUserUpdatePayload(await request.json());
}

export async function parseUserStatusUpdateRequest(request: Request) {
  return parseUserStatusUpdatePayload(await request.json());
}

export async function parseUserPasswordResetRequest(request: Request) {
  return parseUserPasswordResetPayload(await request.json());
}
