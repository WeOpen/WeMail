import type { Hono } from "hono";
import {
  parseAccountBulkDeletePayload,
  parseAccountPolicyRecord,
  parseAccountPolicyUpdatePayload,
  toPersistableAccountPolicy,
  type MailboxStatus
} from "@wemail/shared";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import { CACHE_KEYS, CACHE_TTL_SECONDS, cachedJson, deleteCacheKeys } from "../../app/services/cache-service";
import { toMailboxCreateResponse, toMailboxListResponse, toMailboxDetailListResponse } from "../../app/routes/dto/mailbox-dto";
import { parseMailboxCreateRequest } from "../../app/routes/requests/mailbox-request";
import {
  applyInactiveMailboxLifecycle,
  bulkDeleteMailboxesAsAdmin,
  createUserMailbox,
  deleteMailboxAsAdmin,
  deleteUserMailbox,
  listAvailableMailboxDomains,
  listAllMailboxesWithDetails,
  listSelectableMailboxesPage,
  listUserMailboxes,
  updateMailboxAsAdmin
} from "../../app/use-cases/mailbox-use-cases";

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

function parseUserMailboxPageSize(value: string | undefined) {
  const parsed = parsePositiveInteger(value, 10);
  if (parsed > 50) return 50;
  return parsed;
}

function parseAccountActiveRange(value: string | undefined) {
  return value && accountActiveRanges.has(value) ? (value as "7d" | "30d" | "90d") : undefined;
}

function getInactiveDaysFromPolicy(record: Awaited<ReturnType<AppContext["Variables"]["store"]["accountSettings"]["get"]>>) {
  const policy = parseAccountPolicyRecord(record);
  const inactiveDays = Number(policy.lifecycle?.inactiveDays);
  return Number.isFinite(inactiveDays) && inactiveDays > 0 ? Math.trunc(inactiveDays) : 30;
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
    const hasListQuery = Boolean(c.req.query("page") || c.req.query("pageSize") || c.req.query("search"));
    if (hasListQuery) {
      const result = await listSelectableMailboxesPage(getAppServices(c), user, {
        page: parsePositiveInteger(c.req.query("page"), 1),
        pageSize: parseUserMailboxPageSize(c.req.query("pageSize")),
        search: c.req.query("search") ?? ""
      });
      return c.json(toMailboxListResponse(result, { includeCreator: user.role === "admin" }));
    }
    return c.json(toMailboxListResponse(await listUserMailboxes(getAppServices(c), user.id)));
  });

  app.get("/api/accounts/domains", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const result = await listAvailableMailboxDomains(getAppServices(c), user.id);
    if (result instanceof Response) return result;
    return c.json(result);
  });

  app.get("/api/accounts/list", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const page = parsePositiveInteger(c.req.query("page"), 1);
    const pageSize = parseAccountListPageSize(c.req.query("pageSize"));
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "all";
    const activeRange = parseAccountActiveRange(c.req.query("activeRange"));
    const createdBy = c.req.query("createdBy") || "all";
    const quickFilter = c.req.query("quickFilter") || undefined;
    const policyRecord = await c.get("store").accountSettings.get();
    const accountPolicy = parseAccountPolicyRecord(policyRecord);
    const inactiveDays = getInactiveDaysFromPolicy(policyRecord);

    if (user.role === "admin" && policyRecord) {
      await applyInactiveMailboxLifecycle(getAppServices(c), accountPolicy);
    }

    const result = await listAllMailboxesWithDetails(getAppServices(c), {
      page,
      pageSize,
      userId: user.role === "admin" ? undefined : user.id,
      search,
      status,
      activeRange,
      createdBy: user.role === "admin" ? createdBy : "all",
      inactiveDays,
      quickFilter: quickFilter === "anomaly" || quickFilter === "inactive" ? quickFilter : undefined
    });

    return c.json(toMailboxDetailListResponse(result));
  });

  app.post("/api/accounts", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    let payload: Awaited<ReturnType<typeof parseMailboxCreateRequest>>;
    try {
      payload = await parseMailboxCreateRequest(c.req.raw);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const mailbox = await createUserMailbox(getAppServices(c), {
      userId: user.id,
      label: payload.label,
      domain: payload.domain,
      creatorNote: payload.creatorNote,
      status: payload.status,
      tags: payload.tags
    });
    if (mailbox instanceof Response) return mailbox;
    return c.json(toMailboxCreateResponse(mailbox), 201);
  });

  app.post("/api/accounts/bulk-delete", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    let payload: ReturnType<typeof parseAccountBulkDeletePayload>;
    try {
      payload = parseAccountBulkDeletePayload(await c.req.json());
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const result = await bulkDeleteMailboxesAsAdmin(getAppServices(c), {
      actorUserId: user.id,
      ...payload
    });
    if (result instanceof Response) return result;
    return c.json(result);
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
    const policy = await cachedJson(c.env.CACHE, CACHE_KEYS.accountPolicy, CACHE_TTL_SECONDS.settings, async () =>
      parseAccountPolicyRecord(await c.get("store").accountSettings.get())
    );
    return c.json({ policy });
  });

  app.put("/api/accounts/settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const current = parseAccountPolicyRecord(await c.get("store").accountSettings.get());
    let payload: ReturnType<typeof parseAccountPolicyUpdatePayload>;
    try {
      payload = parseAccountPolicyUpdatePayload(await c.req.json(), current);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const next = toPersistableAccountPolicy(payload, current);
    const record = await c.get("store").accountSettings.save({
      creationJson: JSON.stringify(next.creation),
      lifecycleJson: JSON.stringify(next.lifecycle),
      protectionJson: JSON.stringify(next.protection)
    });
    await recordAudit(c.get("store"), "user", user.id, "account-settings-update", {
      sections: Object.keys(payload)
    });
    await deleteCacheKeys(c.env.CACHE, [CACHE_KEYS.accountPolicy]);
    return c.json({ policy: parseAccountPolicyRecord(record) });
  });
}
