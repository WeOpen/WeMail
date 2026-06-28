import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { toInviteListItem } from "../../app/routes/dto/admin-dto";
import {
  parseUserPasswordResetRequest,
  parseInviteCreateRequest,
  parseQuotaUpdateRequest,
  parseSettingsListQuery,
  parseUserListQuery,
  parseUserCreateRequest,
  parseUserStatusUpdateRequest,
  parseUserUpdateRequest
} from "../../app/routes/requests/admin-request";
import {
  createAdminUserUseCase,
  createInvitesUseCase,
  deleteUserUseCase,
  getAdminCommercialSummary,
  disableInviteUseCase,
  getAdminGovernanceSummary,
  getAdminUserSettingsSummary,
  getQuotaUseCase,
  listAdminInvites,
  listAdminMailboxes,
  listAdminUsers,
  resetUserPasswordUseCase,
  updateQuotaUseCase,
  updateUserProfileUseCase,
  updateUserStatusUseCase
} from "../../app/use-cases/admin-use-cases";

function requireAdminSession(c: { get: <T>(key: string) => T }) {
  const user = requireUser(c);
  if (!user || user.role !== "admin" || !requireSessionAuth(c)) return null;
  return user;
}

export function registerUsersRoutes(app: Hono<AppContext>) {
  app.use("/api/users", async (c, next) => {
    if (!requireAdminSession(c)) return jsonError("Admin session required", 403);
    return next();
  });

  app.use("/api/users/*", async (c, next) => {
    if (!requireAdminSession(c)) return jsonError("Admin session required", 403);
    return next();
  });

  app.get("/api/users", async (c) => c.json(await listAdminUsers(getAppServices(c), parseUserListQuery(c.req.url))));

  app.get("/api/users/summary", async (c) => c.json(await getAdminUserSettingsSummary(getAppServices(c))));

  app.get("/api/users/governance", async (c) => c.json({ governance: await getAdminGovernanceSummary(getAppServices(c)) }));

  app.get("/api/users/commercial", async (c) => c.json({ commercial: await getAdminCommercialSummary(getAppServices(c)) }));

  app.post("/api/users", async (c) => {
    const payload = await parseUserCreateRequest(c.req.raw);
    const result = await createAdminUserUseCase(getAppServices(c), {
      actorUserId: requireUser(c)!.id,
      ...payload
    });
    if (result instanceof Response) return result;
    return c.json({ user: result }, 201);
  });

  app.patch("/api/users/:userId", async (c) => {
    const payload = await parseUserUpdateRequest(c.req.raw);
    const result = await updateUserProfileUseCase(getAppServices(c), {
      actorUserId: requireUser(c)!.id,
      userId: c.req.param("userId"),
      ...payload
    });
    if (result instanceof Response) return result;
    return c.json({ user: result });
  });

  app.patch("/api/users/:userId/password", async (c) => {
    const payload = await parseUserPasswordResetRequest(c.req.raw);
    const result = await resetUserPasswordUseCase(getAppServices(c), {
      actorUserId: requireUser(c)!.id,
      userId: c.req.param("userId"),
      password: payload.password
    });
    if (result instanceof Response) return result;
    return c.json({ user: result });
  });

  app.patch("/api/users/:userId/status", async (c) => {
    const payload = await parseUserStatusUpdateRequest(c.req.raw);
    const result = await updateUserStatusUseCase(getAppServices(c), {
      actorUserId: requireUser(c)!.id,
      userId: c.req.param("userId"),
      status: payload.status
    });
    if (result instanceof Response) return result;
    return c.json({ user: result });
  });

  app.delete("/api/users/:userId", async (c) => {
    const result = await deleteUserUseCase(getAppServices(c), {
      actorUserId: requireUser(c)!.id,
      userId: c.req.param("userId")
    });
    if (result instanceof Response) return result;
    return c.json(result);
  });

  app.get("/api/users/invites", async (c) => {
    const payload = await listAdminInvites(getAppServices(c), parseSettingsListQuery(c.req.url));
    return c.json({
      ...payload,
      invites: payload.invites.map(toInviteListItem)
    });
  });

  app.post("/api/users/invites", async (c) => {
    const user = requireUser(c)!;
    const payload = await parseInviteCreateRequest(c.req.raw);
    const invites = await createInvitesUseCase(getAppServices(c), user.id, payload);
    return c.json({ invite: invites[0] ? toInviteListItem(invites[0]) : null, invites: invites.map(toInviteListItem) }, 201);
  });

  app.delete("/api/users/invites/:id", async (c) => {
    const user = requireUser(c)!;
    const result = await disableInviteUseCase(getAppServices(c), { actorUserId: user.id, inviteId: c.req.param("id") });
    if (result instanceof Response) return result;
    return c.json(result);
  });

  app.get("/api/users/:userId/quota", async (c) =>
    c.json({ quota: await getQuotaUseCase(getAppServices(c), c.req.param("userId")) })
  );

  app.patch("/api/users/:userId/quota", async (c) => {
    const existing = await getQuotaUseCase(getAppServices(c), c.req.param("userId"));
    const payload = await parseQuotaUpdateRequest(c.req.raw, {
      apiDailyLimit: existing.apiDailyLimit,
      dailyLimit: existing.dailyLimit,
      disabled: existing.disabled
    });
    return c.json({
      quota: await updateQuotaUseCase(getAppServices(c), {
        actorUserId: requireUser(c)!.id,
        userId: existing.userId,
        apiDailyLimit: payload.apiDailyLimit,
        dailyLimit: payload.dailyLimit,
        disabled: payload.disabled
      })
    });
  });

  app.get("/api/users/accounts", async (c) =>
    c.json(await listAdminMailboxes(getAppServices(c), parseSettingsListQuery(c.req.url)))
  );
}
