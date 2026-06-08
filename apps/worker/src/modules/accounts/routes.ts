import type { Hono } from "hono";
import type { MailboxStatus } from "@wemail/shared";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import { toMailboxCreateResponse, toMailboxListResponse, toMailboxDetailListResponse } from "../../app/routes/dto/mailbox-dto";
import { parseMailboxCreateRequest } from "../../app/routes/requests/mailbox-request";
import {
  createUserMailbox,
  deleteMailboxAsAdmin,
  deleteUserMailbox,
  listAllMailboxesWithDetails,
  listUserMailboxes,
  updateMailboxAsAdmin
} from "../../app/use-cases/mailbox-use-cases";

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

const mailboxStatuses = new Set<MailboxStatus>(["enabled", "disabled", "archived", "soft_deleted"]);
const accountActiveRanges = new Set(["7d", "30d", "90d"]);
const accountListPageSizes = new Set([10, 20, 50, 500]);

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.trunc(parsed);
}

function parseAccountListPageSize(value: string | undefined) {
  const parsed = parsePositiveInteger(value, 10);
  if (accountListPageSizes.has(parsed)) return parsed;
  if (parsed > 500) return 500;
  return 10;
}

function parseAccountActiveRange(value: string | undefined) {
  return value && accountActiveRanges.has(value) ? (value as "7d" | "30d" | "90d") : undefined;
}

function getInactiveDaysFromPolicy(record: Awaited<ReturnType<AppContext["Variables"]["store"]["accountSettings"]["get"]>>) {
  const policy = parseAccountPolicy(record);
  const inactiveDays = Number(policy.lifecycle?.inactiveDays);
  return Number.isFinite(inactiveDays) && inactiveDays > 0 ? Math.trunc(inactiveDays) : defaultAccountPolicy.lifecycle.inactiveDays;
}

function parseMailboxUpdatePayload(input: unknown) {
  const payload = (input ?? {}) as Record<string, unknown>;
  const result: { label?: string; status?: MailboxStatus } = {};

  if (typeof payload.label !== "undefined") {
    if (typeof payload.label !== "string" || payload.label.trim().length === 0) {
      throw new Error("label is required");
    }

    result.label = payload.label.trim();
  }

  if (typeof payload.status !== "undefined") {
    if (!mailboxStatuses.has(payload.status as MailboxStatus)) {
      throw new Error("status must be enabled, disabled, archived, or soft_deleted");
    }

    result.status = payload.status as MailboxStatus;
  }

  if (typeof result.label === "undefined" && typeof result.status === "undefined") {
    throw new Error("label or status is required");
  }

  return result;
}

export function registerAccountsRoutes(app: Hono<AppContext>) {
  app.get("/api/accounts", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json(toMailboxListResponse(await listUserMailboxes(getAppServices(c), user.id)));
  });

  app.get("/api/accounts/list", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin") return jsonError("Admin access required", 403);

    const page = parsePositiveInteger(c.req.query("page"), 1);
    const pageSize = parseAccountListPageSize(c.req.query("pageSize"));
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "all";
    const activeRange = parseAccountActiveRange(c.req.query("activeRange"));
    const createdBy = c.req.query("createdBy") || "all";
    const quickFilter = c.req.query("quickFilter") || undefined;
    const inactiveDays = getInactiveDaysFromPolicy(await c.get("store").accountSettings.get());

    const result = await listAllMailboxesWithDetails(getAppServices(c), {
      page,
      pageSize,
      search,
      status,
      activeRange,
      createdBy,
      inactiveDays,
      quickFilter: quickFilter === "anomaly" || quickFilter === "inactive" ? quickFilter : undefined
    });

    return c.json(toMailboxDetailListResponse(result));
  });

  app.post("/api/accounts", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const { label: safeLabel } = await parseMailboxCreateRequest(c.req.raw);
    const mailbox = await createUserMailbox(getAppServices(c), { userId: user.id, label: safeLabel });
    if (mailbox instanceof Response) return mailbox;
    return c.json(toMailboxCreateResponse(mailbox), 201);
  });

  app.patch("/api/accounts/:id", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin") return jsonError("Admin access required", 403);

    let payload: { label?: string; status?: MailboxStatus };
    try {
      payload = parseMailboxUpdatePayload(await c.req.json());
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const result = await updateMailboxAsAdmin(getAppServices(c), {
      actorUserId: user.id,
      mailboxId: c.req.param("id"),
      ...payload
    });
    if (result instanceof Response) return result;
    return c.json({ account: result });
  });

  app.delete("/api/accounts/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const result =
      user.role === "admin"
        ? await deleteMailboxAsAdmin(getAppServices(c), { actorUserId: user.id, mailboxId: c.req.param("id") })
        : await deleteUserMailbox(getAppServices(c), { userId: user.id, mailboxId: c.req.param("id") });
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
