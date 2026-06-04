import { parseQuotaPayload, parseUserCreatePayload, parseUserRoleUpdatePayload } from "@wemail/shared";

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
