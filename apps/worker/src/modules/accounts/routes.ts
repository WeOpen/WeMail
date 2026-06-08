import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import { toMailboxCreateResponse, toMailboxListResponse } from "../../app/routes/dto/mailbox-dto";
import { parseMailboxCreateRequest } from "../../app/routes/requests/mailbox-request";
import { createUserMailbox, deleteUserMailbox, listUserMailboxes } from "../../app/use-cases/mailbox-use-cases";

const defaultAccountPolicy = {
  creation: {
    defaultTagsEnabled: true,
    defaultTags: "运营, 高优先级",
    allowCreationOverride: true,
    defaultStatus: "启用",
    requireCreatorNote: false
  },
  lifecycle: {
    inactiveDays: 30,
    inactiveAction: "自动归档",
    softDeleteRetentionDays: 30,
    allowHardDelete: false,
    requireSoftDeleteBeforeHardDelete: true
  },
  protection: {
    confirmStandardBulkActions: true,
    standardBulkLimit: 100,
    requireDangerPhrase: true,
    hardDeleteLimit: 20,
    auditLoggingEnabled: true
  },
  lastUpdatedLabel: "尚未更新"
};

function parseAccountPolicy(record: Awaited<ReturnType<AppContext["Variables"]["store"]["accountSettings"]["get"]>>) {
  if (!record) return defaultAccountPolicy;
  return {
    creation: JSON.parse(record.creationJson),
    lifecycle: JSON.parse(record.lifecycleJson),
    protection: JSON.parse(record.protectionJson),
    lastUpdatedLabel: record.updatedAt
  };
}

export function registerAccountsRoutes(app: Hono<AppContext>) {
  app.get("/api/accounts", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json(toMailboxListResponse(await listUserMailboxes(getAppServices(c), user.id)));
  });

  app.post("/api/accounts", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const { label: safeLabel } = await parseMailboxCreateRequest(c.req.raw);
    const mailbox = await createUserMailbox(getAppServices(c), { userId: user.id, label: safeLabel });
    if (mailbox instanceof Response) return mailbox;
    return c.json(toMailboxCreateResponse(mailbox), 201);
  });

  app.delete("/api/accounts/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const result = await deleteUserMailbox(getAppServices(c), { userId: user.id, mailboxId: c.req.param("id") });
    if (result instanceof Response) return result;
    return c.json(result);
  });

  app.get("/api/accounts/settings", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json({ policy: parseAccountPolicy(await c.get("store").accountSettings.get()) });
  });

  app.put("/api/accounts/settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const payload = (await c.req.json()) as Partial<typeof defaultAccountPolicy>;
    const current = parseAccountPolicy(await c.get("store").accountSettings.get());
    const next = {
      creation: payload.creation ?? current.creation,
      lifecycle: payload.lifecycle ?? current.lifecycle,
      protection: payload.protection ?? current.protection
    };
    const record = await c.get("store").accountSettings.save({
      creationJson: JSON.stringify(next.creation),
      lifecycleJson: JSON.stringify(next.lifecycle),
      protectionJson: JSON.stringify(next.protection)
    });
    await recordAudit(c.get("store"), "user", user.id, "account-settings-update", {});
    return c.json({ policy: parseAccountPolicy(record) });
  });
}
