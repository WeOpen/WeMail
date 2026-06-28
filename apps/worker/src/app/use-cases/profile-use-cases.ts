import {
  defaultUserProfilePreferences,
  type UserProfilePreferences,
  type UserProfileSummary,
  type UserSessionSummary,
  type UserProfileUpdateInput
} from "@wemail/shared";

import type { AppStore, SessionRecord, UserPreferencesRecord, UserRecord } from "../../core/bindings";
import { jsonError, recordAudit } from "../services/audit-service";

type ProfileUseCaseContext = {
  store: AppStore;
};

function toUserSummary(user: UserRecord): UserProfileSummary["user"] {
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

function toUserSessionSummary(session: SessionRecord, currentSessionId: string | null): UserSessionSummary {
  return {
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    isCurrent: session.id === currentSessionId
  };
}

function toUserProfilePreferences(
  record: UserPreferencesRecord | null,
  fallbackUpdatedAt: string
): UserProfilePreferences {
  if (!record) {
    return {
      ...defaultUserProfilePreferences,
      updatedAt: fallbackUpdatedAt
    };
  }

  return {
    bio: record.bio,
    locale: record.locale as UserProfilePreferences["locale"],
    timezone: record.timezone as UserProfilePreferences["timezone"],
    dateFormat: record.dateFormat as UserProfilePreferences["dateFormat"],
    landingPage: record.landingPage as UserProfilePreferences["landingPage"],
    density: record.density as UserProfilePreferences["density"],
    updatedAt: record.updatedAt
  };
}

async function buildUserProfile(context: ProfileUseCaseContext, user: UserRecord): Promise<UserProfileSummary> {
  const preferences = await context.store.userPreferences.getByUserId(user.id);

  return {
    user: toUserSummary(user),
    preferences: toUserProfilePreferences(preferences, user.updatedAt || user.createdAt)
  };
}

export async function getUserProfileUseCase(context: ProfileUseCaseContext, userId: string) {
  const user = await context.store.users.findById(userId);
  if (!user) return jsonError("User not found", 404);
  return buildUserProfile(context, user);
}

export async function listCurrentUserSessionsUseCase(
  context: ProfileUseCaseContext,
  payload: { actorUserId: string; currentSessionId: string | null }
) {
  const sessions = await context.store.sessions.listByUser(payload.actorUserId);
  const now = new Date();
  const activeSessions = sessions.filter((session) => new Date(session.expiresAt) > now);
  await Promise.all(
    sessions
      .filter((session) => new Date(session.expiresAt) <= now)
      .map((session) => context.store.sessions.delete(session.id))
  );

  return activeSessions.map((session) => toUserSessionSummary(session, payload.currentSessionId));
}

export async function revokeCurrentUserSessionUseCase(
  context: ProfileUseCaseContext,
  payload: { actorUserId: string; currentSessionId: string | null; sessionId: string }
) {
  const session = await context.store.sessions.findById(payload.sessionId);
  if (!session || session.userId !== payload.actorUserId) return jsonError("Session not found", 404);
  if (session.id === payload.currentSessionId) return jsonError("Use logout to revoke current session", 400);

  await context.store.sessions.delete(session.id);
  await recordAudit(context.store, "user", payload.actorUserId, "session-revoke", { sessionId: session.id });
  return { ok: true };
}

export async function revokeOtherCurrentUserSessionsUseCase(
  context: ProfileUseCaseContext,
  payload: { actorUserId: string; currentSessionId: string }
) {
  await context.store.sessions.deleteByUserIdExcept(payload.actorUserId, payload.currentSessionId);
  await recordAudit(context.store, "user", payload.actorUserId, "session-revoke-others", {
    currentSessionId: payload.currentSessionId
  });
  return { ok: true };
}

export async function updateCurrentUserProfileUseCase(
  context: ProfileUseCaseContext,
  payload: UserProfileUpdateInput & { actorUserId: string }
) {
  let user = await context.store.users.findById(payload.actorUserId);
  if (!user) return jsonError("User not found", 404);

  if (payload.name) {
    const updatedUser = await context.store.users.updateProfile(payload.actorUserId, { name: payload.name });
    if (!updatedUser) return jsonError("User not found", 404);
    user = updatedUser;
  }

  if (payload.preferences) {
    const existing = await context.store.userPreferences.getByUserId(payload.actorUserId);
    const current = toUserProfilePreferences(existing, user.updatedAt || user.createdAt);
    await context.store.userPreferences.save({
      userId: payload.actorUserId,
      bio: payload.preferences.bio ?? current.bio,
      locale: payload.preferences.locale ?? current.locale,
      timezone: payload.preferences.timezone ?? current.timezone,
      dateFormat: payload.preferences.dateFormat ?? current.dateFormat,
      landingPage: payload.preferences.landingPage ?? current.landingPage,
      density: payload.preferences.density ?? current.density
    });
  }

  await recordAudit(context.store, "user", payload.actorUserId, "profile-update", {
    updatedPreferences: Object.keys(payload.preferences ?? {}),
    updatedName: Boolean(payload.name)
  });

  return buildUserProfile(context, user);
}
