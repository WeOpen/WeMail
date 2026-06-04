import type { UserRole } from "@wemail/shared";

import type { AppBindings, AppStore, UserRecord } from "../../core/bindings";
import { hashPassword } from "../../shared/auth";
import { jsonError, recordAudit } from "../services/audit-service";
import { getOutboundLimit } from "../services/config-service";

type AdminUseCaseContext = {
  store: AppStore;
  env: AppBindings;
};

export async function listAdminUsers(context: AdminUseCaseContext) {
  const users = await context.store.users.list();
  return Promise.all(users.map((user) => toAdminUserSummary(context, user)));
}

async function toAdminUserSummary(context: AdminUseCaseContext, user: UserRecord) {
  const quota = await context.store.quotas.getByUserId(user.id, getOutboundLimit(context.env));
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: quota.disabled ? "outbound_disabled" : "active",
    createdAt: user.createdAt
  };
}

export async function createAdminUserUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; email: string; password: string; role: UserRole }
) {
  if (await context.store.users.findByEmail(payload.email)) return jsonError("User already exists", 409);

  const user = await context.store.users.create({
    email: payload.email,
    passwordHash: await hashPassword(payload.password),
    role: payload.role
  });

  await context.store.quotas.save({
    userId: user.id,
    dailyLimit: getOutboundLimit(context.env),
    sendsToday: 0,
    disabled: false,
    updatedAt: new Date().toISOString()
  });
  await recordAudit(context.store, "user", payload.actorUserId, "user-create", {
    userId: user.id,
    role: user.role
  });

  return toAdminUserSummary(context, user);
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

  return toAdminUserSummary(context, user);
}

export async function listAdminInvites(context: AdminUseCaseContext) {
  return context.store.invites.list();
}

export async function listAdminMailboxes(context: AdminUseCaseContext) {
  return context.store.mailboxes.listAll();
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
  await context.store.invites.disable(payload.inviteId);
  await recordAudit(context.store, "user", payload.actorUserId, "invite-disable", {
    inviteId: payload.inviteId
  });
  return { ok: true };
}

export async function getQuotaUseCase(context: AdminUseCaseContext, userId: string) {
  return context.store.quotas.getByUserId(userId, getOutboundLimit(context.env));
}

export async function updateQuotaUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; dailyLimit: number; disabled: boolean }
) {
  const existing = await context.store.quotas.getByUserId(payload.userId, getOutboundLimit(context.env));
  existing.dailyLimit = payload.dailyLimit;
  existing.disabled = payload.disabled;
  existing.updatedAt = new Date().toISOString();
  await context.store.quotas.save(existing);
  await recordAudit(context.store, "user", payload.actorUserId, "quota-update", { userId: existing.userId });
  return existing;
}
