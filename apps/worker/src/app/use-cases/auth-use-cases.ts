import type { FeatureToggles } from "@wemail/shared";

import type { AppBindings, AppStore, InviteRecord, OAuthPendingLoginRecord, OAuthProviderId } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { hashPassword, readSessionCookies, setSessionCookie, verifyPassword } from "../../shared/auth";
import { toSessionResponse } from "../routes/dto/auth-dto";
import { jsonError, recordAudit } from "../services/audit-service";
import { getResolvedApiDailyLimit, getResolvedOutboundLimit } from "../services/config-service";
import {
  buildOAuthAuthorizationUrl,
  fetchOAuthProfile,
  getOAuthProviderConfig,
  OAuthProviderError,
  type OAuthFailureReason,
  type OAuthProfile
} from "../services/oauth-provider-service";
import { getRequestSessionMetadata, sessionExpiryIso } from "../services/session-service";

type AuthUseCaseContext = {
  store: AppStore;
  featureToggles: FeatureToggles;
  env: AppBindings;
};

type OAuthUseCaseContext = AuthUseCaseContext & {
  rawContext: any;
  redirect: (location: string) => Response;
};

function minutesFromNowIso(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function sanitizeRedirectTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/register")) return "/dashboard";
  return value;
}

function buildOAuthInviteRedirect(ticket: string, provider: OAuthProviderId, redirectTo: string) {
  const params = new URLSearchParams({
    oauth: "invite",
    provider,
    ticket,
    next: redirectTo
  });
  return `/login?${params.toString()}`;
}

function buildOAuthErrorRedirect(provider: OAuthProviderId, redirectTo: string, reason: OAuthFailureReason) {
  const params = new URLSearchParams({
    oauth: "error",
    provider,
    reason,
    next: redirectTo
  });
  return `/login?${params.toString()}`;
}

function resolveOAuthFailureReason(error: unknown): OAuthFailureReason {
  return error instanceof OAuthProviderError ? error.reason : "provider_unavailable";
}

async function initializeUserQuota(c: Pick<AuthUseCaseContext, "store" | "env">, userId: string) {
  const [apiDailyLimit, dailyLimit] = await Promise.all([
    getResolvedApiDailyLimit(c.store, c.env),
    getResolvedOutboundLimit(c.store, c.env)
  ]);
  await c.store.quotas.save({
    userId,
    apiDailyLimit,
    apiCallsToday: 0,
    dailyLimit,
    sendsToday: 0,
    disabled: false,
    updatedAt: new Date().toISOString()
  });
}

async function createSessionForUser(c: AuthUseCaseContext, userId: string, rawContext: any) {
  const session = await c.store.sessions.create({
    userId,
    expiresAt: sessionExpiryIso(c.env),
    ...getRequestSessionMetadata(rawContext)
  });
  setSessionCookie(rawContext, session.id);
}

function getAuditSessionMetadata(rawContext: any) {
  const metadata = getRequestSessionMetadata(rawContext);
  return {
    ipAddress: metadata.ipAddress ?? null,
    userAgent: metadata.userAgent ?? null
  };
}

async function recordLoginFailure(
  c: AuthUseCaseContext,
  input: { email: string; reason: string; userId?: string | null },
  rawContext: any
) {
  await recordAudit(c.store, input.userId ? "user" : "auth", input.userId ?? input.email, "login-failed", {
    email: input.email,
    method: "password",
    reason: input.reason,
    ...getAuditSessionMetadata(rawContext)
  });
}

async function recordOAuthLoginFailure(
  c: AuthUseCaseContext,
  provider: OAuthProviderId,
  reason: string,
  rawContext: any,
  detail?: Record<string, unknown>
) {
  await recordAudit(c.store, "auth", provider, "oauth-login-failed", {
    provider,
    reason,
    ...getAuditSessionMetadata(rawContext),
    ...detail
  });
}

function isInviteExpired(invite: Pick<InviteRecord, "expiresAt">) {
  return Boolean(invite.expiresAt && new Date(invite.expiresAt) <= new Date());
}

function isInviteUsable(invite: InviteRecord | null) {
  return Boolean(invite && invite.redemptionCount < invite.maxRedemptions && !invite.disabledAt && !isInviteExpired(invite));
}

function resolveUserRoleFromInvite(
  c: AuthUseCaseContext,
  input: { email: string; userCount: number; invite: InviteRecord | null }
) {
  if (input.userCount === 0 || resolveAppConfig(c.env).adminEmails.includes(input.email)) return "admin";
  return input.invite?.targetRole ?? "member";
}

export async function registerUserWithInvite(
  c: AuthUseCaseContext,
  payload: { email: string; name: string; password: string; inviteCode: string | null },
  rawContext: any
) {
  if (await c.store.users.findByEmail(payload.email)) return jsonError("User already exists", 409);
  const userCount = await c.store.users.count();
  const canBootstrapWithoutInvite = userCount === 0 && !payload.inviteCode;
  const invite = payload.inviteCode ? await c.store.invites.findByCode(payload.inviteCode) : null;

  if (!canBootstrapWithoutInvite && !isInviteUsable(invite)) {
    return jsonError("Invite is invalid", 403);
  }

  const user = await c.store.users.create({
    email: payload.email,
    name: payload.name,
    passwordHash: await hashPassword(payload.password),
    role: resolveUserRoleFromInvite(c, { email: payload.email, userCount, invite })
  });

  if (payload.inviteCode) await c.store.invites.redeem(payload.inviteCode, user.id);
  await initializeUserQuota(c, user.id);
  await createSessionForUser(c, user.id, rawContext);
  await recordAudit(c.store, "user", user.id, "register", { inviteCode: payload.inviteCode });

  return toSessionResponse(user, c.featureToggles);
}

export async function loginUser(
  c: AuthUseCaseContext,
  payload: { email: string; password: string },
  rawContext: any
) {
  const user = await c.store.users.findByEmail(payload.email);
  const passwordValid = user ? await verifyPassword(payload.password, user.passwordHash) : false;
  if (!user || !passwordValid) {
    await recordLoginFailure(c, { email: payload.email, reason: "invalid_credentials", userId: user?.id ?? null }, rawContext);
    return jsonError("Invalid credentials", 401);
  }
  if (user.status !== "active") {
    await recordLoginFailure(c, { email: user.email, reason: "user_disabled", userId: user.id }, rawContext);
    return jsonError("User is disabled", 403);
  }

  await createSessionForUser(c, user.id, rawContext);
  await recordAudit(c.store, "user", user.id, "login", {
    email: user.email,
    method: "password",
    ...getAuditSessionMetadata(rawContext)
  });

  return toSessionResponse(user, c.featureToggles);
}

export async function startOAuthLogin(c: OAuthUseCaseContext, provider: OAuthProviderId, next: string | null) {
  const runtimeConfig = getOAuthProviderConfig(resolveAppConfig(c.env), provider);
  if (!runtimeConfig) return jsonError("OAuth provider is not configured", 503);

  const state = await c.store.oauthStates.create({
    provider,
    redirectTo: sanitizeRedirectTo(next),
    expiresAt: minutesFromNowIso(10)
  });

  return c.redirect(buildOAuthAuthorizationUrl(provider, runtimeConfig, state.id));
}

async function loginOAuthUser(
  c: OAuthUseCaseContext,
  userId: string,
  profile: OAuthProfile,
  action: "oauth_login" | "oauth_register"
) {
  const user = await c.store.users.findById(userId);
  if (!user) return jsonError("User not found", 404);
  if (user.status !== "active") return jsonError("User is disabled", 403);

  await c.store.oauthIdentities.upsert({
    userId: user.id,
    provider: profile.provider,
    providerUserId: profile.providerUserId,
    providerEmail: profile.email,
    providerLogin: profile.login
  });
  await createSessionForUser(c, user.id, c.rawContext);
  await recordAudit(c.store, "user", user.id, action, {
    email: user.email,
    method: "oauth",
    provider: profile.provider,
    providerEmail: profile.email,
    providerLogin: profile.login,
    ...getAuditSessionMetadata(c.rawContext)
  });
  return toSessionResponse(user, c.featureToggles);
}

async function findOAuthUser(c: AuthUseCaseContext, profile: OAuthProfile) {
  const identity = await c.store.oauthIdentities.findByProviderUser(profile.provider, profile.providerUserId);
  if (identity) return c.store.users.findById(identity.userId);
  return c.store.users.findByEmail(profile.email);
}

export async function handleOAuthCallback(c: OAuthUseCaseContext, provider: OAuthProviderId, code: string | null, stateId: string | null) {
  if (!code || !stateId) return jsonError("OAuth callback is invalid", 400);

  const state = await c.store.oauthStates.consume(stateId);
  if (!state || state.provider !== provider) return jsonError("OAuth state is invalid", 400);

  const runtimeConfig = getOAuthProviderConfig(resolveAppConfig(c.env), provider);
  if (!runtimeConfig) return jsonError("OAuth provider is not configured", 503);

  let profile: OAuthProfile;
  try {
    profile = await fetchOAuthProfile(provider, runtimeConfig, code);
  } catch (error) {
    const reason = resolveOAuthFailureReason(error);
    await recordOAuthLoginFailure(c, provider, reason, c.rawContext);
    return c.redirect(buildOAuthErrorRedirect(provider, state.redirectTo, reason));
  }
  const existingUser = await findOAuthUser(c, profile);
  if (existingUser) {
    const result = await loginOAuthUser(c, existingUser.id, profile, "oauth_login");
    if (result instanceof Response) return result;
    return c.redirect(state.redirectTo);
  }

  const pending = await c.store.oauthPendingLogins.create({
    provider,
    providerUserId: profile.providerUserId,
    providerEmail: profile.email,
    providerName: profile.name,
    providerLogin: profile.login,
    redirectTo: state.redirectTo,
    expiresAt: minutesFromNowIso(15)
  });

  return c.redirect(buildOAuthInviteRedirect(pending.id, provider, state.redirectTo));
}

function profileFromPending(pending: OAuthPendingLoginRecord): OAuthProfile {
  return {
    provider: pending.provider,
    providerUserId: pending.providerUserId,
    email: pending.providerEmail,
    name: pending.providerName,
    login: pending.providerLogin
  };
}

export async function finalizeOAuthLogin(
  c: OAuthUseCaseContext,
  provider: OAuthProviderId,
  payload: { ticket: string | null; inviteCode: string | null }
) {
  if (!payload.ticket) {
    await recordOAuthLoginFailure(c, provider, "missing_ticket", c.rawContext);
    return jsonError("OAuth ticket is required", 400);
  }
  if (!payload.inviteCode) {
    await recordOAuthLoginFailure(c, provider, "missing_invite", c.rawContext, { ticket: payload.ticket });
    return jsonError("Invite is invalid", 403);
  }

  const pending = await c.store.oauthPendingLogins.findById(payload.ticket);
  if (!pending || pending.provider !== provider) {
    await recordOAuthLoginFailure(c, provider, "invalid_ticket", c.rawContext, { ticket: payload.ticket });
    return jsonError("OAuth ticket is invalid", 400);
  }

  const profile = profileFromPending(pending);
  const existingUser = await findOAuthUser(c, profile);
  if (existingUser) {
    const result = await loginOAuthUser(c, existingUser.id, profile, "oauth_login");
    if (result instanceof Response) return result;
    return result;
  }

  const invite = await c.store.invites.findByCode(payload.inviteCode);
  if (!isInviteUsable(invite)) {
    await recordOAuthLoginFailure(c, provider, "invalid_invite", c.rawContext, {
      email: profile.email,
      inviteCode: payload.inviteCode
    });
    return jsonError("Invite is invalid", 403);
  }
  const consumed = await c.store.oauthPendingLogins.consume(payload.ticket);
  if (!consumed || consumed.provider !== provider) return jsonError("OAuth ticket is invalid", 400);

  const userCount = await c.store.users.count();
  const user = await c.store.users.create({
    email: profile.email,
    name: profile.name,
    passwordHash: await hashPassword(crypto.randomUUID()),
    role: resolveUserRoleFromInvite(c, { email: profile.email, userCount, invite })
  });
  await c.store.invites.redeem(payload.inviteCode, user.id);
  await initializeUserQuota(c, user.id);

  const result = await loginOAuthUser(c, user.id, profile, "oauth_register");
  if (result instanceof Response) return result;
  return result;
}

export async function logoutUser(c: Pick<AuthUseCaseContext, "store">, rawContext: any) {
  const sessionTokens = readSessionCookies(rawContext);
  await Promise.all(sessionTokens.map((sessionToken) => c.store.sessions.delete(sessionToken)));
}
