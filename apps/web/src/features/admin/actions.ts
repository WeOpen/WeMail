import type { FeatureToggles, UserRole } from "@wemail/shared";

import { createAdminUser, createInvite, disableInvite, updateAdminFeatures, updateAdminUserRole, updateQuota } from "./api";

export async function createAdminUserAction(payload: { email: string; password: string; role: UserRole }) {
  return createAdminUser(payload);
}

export async function updateAdminUserRoleAction(userId: string, role: UserRole) {
  return updateAdminUserRole(userId, role);
}

export async function createInviteAction() {
  return createInvite();
}

export async function disableInviteAction(inviteId: string) {
  return disableInvite(inviteId);
}

export async function updateQuotaAction(userId: string, payload: { dailyLimit: number; disabled: boolean }) {
  return updateQuota(userId, payload);
}

export async function updateFeatureTogglesAction(nextFeatureToggles: FeatureToggles) {
  return updateAdminFeatures(nextFeatureToggles);
}
