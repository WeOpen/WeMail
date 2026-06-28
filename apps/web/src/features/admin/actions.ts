import type { FeatureToggles, UserRole, UserStatus } from "@wemail/shared";

import {
  createAdminUser,
  createInvite,
  deleteAdminUser,
  disableInvite,
  resetAdminUserPassword,
  updateAdminFeatures,
  updateAdminUser,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateQuota
} from "./api";
import type { InviteCreatePayload } from "./types";

export async function createAdminUserAction(payload: { email: string; name: string; password: string; role: UserRole }) {
  return createAdminUser(payload);
}

export async function updateAdminUserRoleAction(userId: string, role: UserRole) {
  return updateAdminUserRole(userId, role);
}

export async function updateAdminUserAction(userId: string, payload: { name: string }) {
  return updateAdminUser(userId, payload);
}

export async function resetAdminUserPasswordAction(userId: string, password: string) {
  return resetAdminUserPassword(userId, password);
}

export async function updateAdminUserStatusAction(userId: string, status: UserStatus) {
  return updateAdminUserStatus(userId, status);
}

export async function deleteAdminUserAction(userId: string) {
  return deleteAdminUser(userId);
}

export async function createInviteAction(payload: InviteCreatePayload) {
  return createInvite(payload);
}

export async function disableInviteAction(inviteId: string) {
  return disableInvite(inviteId);
}

export async function updateQuotaAction(userId: string, payload: { apiDailyLimit: number; dailyLimit: number; disabled: boolean }) {
  return updateQuota(userId, payload);
}

export async function updateFeatureTogglesAction(nextFeatureToggles: FeatureToggles) {
  return updateAdminFeatures(nextFeatureToggles);
}
