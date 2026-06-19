import type { UserRole, UserStatus } from "@wemail/shared";

import type { AppBindings, AppStore, PageListOptions, UserListOptions, UserRecord } from "../../core/bindings";
import { hashPassword } from "../../shared/auth";
import { jsonError, recordAudit } from "../services/audit-service";
import { getApiDailyLimit, getOutboundLimit } from "../services/config-service";

type AdminUseCaseContext = {
  store: AppStore;
  env: AppBindings;
};

export async function listAdminUsers(context: AdminUseCaseContext, options: UserListOptions) {
  const result = await context.store.users.list(options);
  return {
    users: result.users.map(toAdminUserSummary),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  };
}

export async function getAdminUserSettingsSummary(context: AdminUseCaseContext) {
  const stats = await context.store.users.summary();
  const quotaUsers = await context.store.users.list({
    page: 1,
    pageSize: Math.max(stats.total, 1)
  });

  return {
    quotaUsers: quotaUsers.users.map(toAdminUserSummary),
    stats
  };
}

function toAdminUserSummary(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function createAdminUserUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; email: string; name: string; password: string; role: UserRole }
) {
  if (await context.store.users.findByEmail(payload.email)) return jsonError("User already exists", 409);

  const user = await context.store.users.create({
    email: payload.email,
    name: payload.name,
    passwordHash: await hashPassword(payload.password),
    role: payload.role
  });

  await context.store.quotas.save({
    userId: user.id,
    apiDailyLimit: getApiDailyLimit(context.env),
    apiCallsToday: 0,
    dailyLimit: getOutboundLimit(context.env),
    sendsToday: 0,
    disabled: false,
    updatedAt: new Date().toISOString()
  });
  await recordAudit(context.store, "user", payload.actorUserId, "user-create", {
    userId: user.id,
    role: user.role
  });

  return toAdminUserSummary(user);
}

export async function updateUserRoleUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; role: UserRole }
) {
  const user = await context.store.users.updateRole(payload.userId, payload.role);
  if (!user) return jsonError("User not found", 404);

  await recordAudit(context.store, "user", payload.actorUserId, "user-role-update", {
    userId: user.id,
    role: user.role
  });

  return toAdminUserSummary(user);
}

export async function updateUserProfileUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; name?: string; role?: UserRole }
) {
  let user = await context.store.users.findById(payload.userId);
  if (!user) return jsonError("User not found", 404);

  if (payload.name) {
    user = await context.store.users.updateProfile(payload.userId, { name: payload.name });
  }
  if (payload.role) {
    user = await context.store.users.updateRole(payload.userId, payload.role);
  }
  if (!user) return jsonError("User not found", 404);

  await recordAudit(context.store, "user", payload.actorUserId, "user-update", {
    userId: user.id,
    name: user.name,
    role: user.role
  });

  return toAdminUserSummary(user);
}

export async function resetUserPasswordUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; password: string }
) {
  const user = await context.store.users.updatePasswordHash(payload.userId, await hashPassword(payload.password));
  if (!user) return jsonError("User not found", 404);
  await context.store.sessions.deleteByUserId(payload.userId);
  await recordAudit(context.store, "user", payload.actorUserId, "user-password-reset", { userId: user.id });
  return toAdminUserSummary(user);
}

export async function updateUserStatusUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; status: UserStatus }
) {
  if (payload.actorUserId === payload.userId && payload.status === "disabled") {
    return jsonError("Cannot disable current user", 400);
  }

  const user = await context.store.users.updateStatus(payload.userId, payload.status);
  if (!user) return jsonError("User not found", 404);
  if (payload.status === "disabled") await context.store.sessions.deleteByUserId(payload.userId);
  await recordAudit(context.store, "user", payload.actorUserId, "user-status-update", {
    userId: user.id,
    status: user.status
  });
  return toAdminUserSummary(user);
}

export async function deleteUserUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string }
) {
  if (payload.actorUserId === payload.userId) return jsonError("Cannot delete current user", 400);
  const deleted = await context.store.users.delete(payload.userId);
  if (!deleted) return jsonError("User not found", 404);
  await recordAudit(context.store, "user", payload.actorUserId, "user-delete", { userId: payload.userId });
  return { ok: true };
}

export async function listAdminInvites(context: AdminUseCaseContext, options: PageListOptions) {
  return context.store.invites.listPage(options);
}

export async function listAdminMailboxes(context: AdminUseCaseContext, options: PageListOptions) {
  return context.store.mailboxes.listPage(options);
}

export async function createInviteUseCase(context: AdminUseCaseContext, actorUserId: string) {
  const code = `INVITE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const invite = await context.store.invites.create({ code, createdByUserId: actorUserId });
  await recordAudit(context.store, "user", actorUserId, "invite-create", { code });
  return invite;
}

export async function disableInviteUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; inviteId: string }
) {
  const invite = await context.store.invites.findById(payload.inviteId);
  if (!invite) return jsonError("Invite not found", 404);
  if (invite.redeemedAt) return jsonError("Invite already redeemed", 409);
  if (invite.disabledAt) return jsonError("Invite already disabled", 409);

  await context.store.invites.disable(payload.inviteId);
  await recordAudit(context.store, "user", payload.actorUserId, "invite-disable", {
    inviteId: payload.inviteId
  });
  return { ok: true };
}

export async function getQuotaUseCase(context: AdminUseCaseContext, userId: string) {
  return context.store.quotas.getByUserId(userId, getOutboundLimit(context.env), getApiDailyLimit(context.env));
}

export async function updateQuotaUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; apiDailyLimit: number; dailyLimit: number; disabled: boolean }
) {
  const existing = await context.store.quotas.getByUserId(payload.userId, getOutboundLimit(context.env), getApiDailyLimit(context.env));
  existing.apiDailyLimit = payload.apiDailyLimit;
  existing.dailyLimit = payload.dailyLimit;
  existing.disabled = payload.disabled;
  existing.updatedAt = new Date().toISOString();
  await context.store.quotas.save(existing);
  await recordAudit(context.store, "user", payload.actorUserId, "quota-update", { userId: existing.userId });
  return existing;
}
