import type { FeatureToggles } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { hashPassword, readSessionCookie, setSessionCookie, verifyPassword } from "../../shared/auth";
import { toSessionResponse } from "../routes/dto/auth-dto";
import { jsonError, recordAudit } from "../services/audit-service";
import { getOutboundLimit } from "../services/config-service";
import { sessionExpiryIso } from "../services/session-service";

type AuthUseCaseContext = {
  store: AppStore;
  featureToggles: FeatureToggles;
  env: AppBindings;
};

export async function registerUserWithInvite(
  c: AuthUseCaseContext,
  payload: { email: string; password: string; inviteCode: string },
  rawContext: any
) {
  if (await c.store.users.findByEmail(payload.email)) return jsonError("User already exists", 409);
  const invite = await c.store.invites.findByCode(payload.inviteCode);
  if (!invite || invite.redeemedAt || invite.disabledAt) return jsonError("Invite is invalid", 403);

  const shouldBeAdmin =
    (await c.store.users.count()) === 0 ||
    resolveAppConfig(c.env).adminEmails.includes(payload.email);

  const user = await c.store.users.create({
    email: payload.email,
    passwordHash: await hashPassword(payload.password),
    role: shouldBeAdmin ? "admin" : "member"
  });

  await c.store.invites.redeem(payload.inviteCode, user.id);
  await c.store.quotas.save({
    userId: user.id,
    dailyLimit: getOutboundLimit(c.env),
    sendsToday: 0,
    disabled: false,
    updatedAt: new Date().toISOString()
  });

  const session = await c.store.sessions.create({ userId: user.id, expiresAt: sessionExpiryIso(c.env) });
  setSessionCookie(rawContext, session.id);
  await recordAudit(c.store, "user", user.id, "register", { inviteCode: payload.inviteCode });

  return toSessionResponse(
    { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    c.featureToggles
  );
}

export async function loginUser(
  c: AuthUseCaseContext,
  payload: { email: string; password: string },
  rawContext: any
) {
  const user = await c.store.users.findByEmail(payload.email);
  if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
    return jsonError("Invalid credentials", 401);
  }

  const session = await c.store.sessions.create({ userId: user.id, expiresAt: sessionExpiryIso(c.env) });
  setSessionCookie(rawContext, session.id);
  await recordAudit(c.store, "user", user.id, "login", {});

  return toSessionResponse(
    { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    c.featureToggles
  );
}

export async function logoutUser(c: Pick<AuthUseCaseContext, "store">, rawContext: any) {
  const sessionToken = readSessionCookie(rawContext);
  if (sessionToken) await c.store.sessions.delete(sessionToken);
}
