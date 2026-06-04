import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { toInviteListItem } from "../../app/routes/dto/admin-dto";
import {
  parseQuotaUpdateRequest,
  parseUserCreateRequest,
  parseUserRoleUpdateRequest
} from "../../app/routes/requests/admin-request";
import {
  createAdminUserUseCase,
  createInviteUseCase,
  disableInviteUseCase,
  getQuotaUseCase,
  listAdminInvites,
  listAdminMailboxes,
  listAdminUsers,
  updateQuotaUseCase,
  updateUserRoleUseCase
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

  app.get("/api/users", async (c) => c.json({ users: await listAdminUsers(getAppServices(c)) }));

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
    const payload = await parseUserRoleUpdateRequest(c.req.raw);
    const result = await updateUserRoleUseCase(getAppServices(c), {
      actorUserId: requireUser(c)!.id,
      userId: c.req.param("userId"),
      role: payload.role
    });
    if (result instanceof Response) return result;
    return c.json({ user: result });
  });

  app.get("/api/users/invites", async (c) =>
    c.json({
      invites: (await listAdminInvites(getAppServices(c))).map(toInviteListItem)
    })
  );

  app.post("/api/users/invites", async (c) => {
    const user = requireUser(c)!;
    const invite = await createInviteUseCase(getAppServices(c), user.id);
    return c.json({ invite }, 201);
  });

  app.delete("/api/users/invites/:id", async (c) => {
    const user = requireUser(c)!;
    return c.json(await disableInviteUseCase(getAppServices(c), { actorUserId: user.id, inviteId: c.req.param("id") }));
  });

  app.get("/api/users/:userId/quota", async (c) =>
    c.json({ quota: await getQuotaUseCase(getAppServices(c), c.req.param("userId")) })
  );

  app.patch("/api/users/:userId/quota", async (c) => {
    const existing = await getQuotaUseCase(getAppServices(c), c.req.param("userId"));
    const payload = await parseQuotaUpdateRequest(c.req.raw, {
      dailyLimit: existing.dailyLimit,
      disabled: existing.disabled
    });
    return c.json({
      quota: await updateQuotaUseCase(getAppServices(c), {
        actorUserId: requireUser(c)!.id,
        userId: existing.userId,
        dailyLimit: payload.dailyLimit,
        disabled: payload.disabled
      })
    });
  });

  app.get("/api/users/accounts", async (c) => c.json({ mailboxes: await listAdminMailboxes(getAppServices(c)) }));
}
