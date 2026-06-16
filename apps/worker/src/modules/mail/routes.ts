import type { Hono } from "hono";
import {
  parseMailSettingsRecord,
  parseMailSettingsUpdatePayload,
  toPersistableMailSettings,
  type MessageFilter,
  type OutboundListStatus,
  type QuotaSummary
} from "@wemail/shared";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import { CACHE_KEYS, CACHE_TTL_SECONDS, cachedJson, deleteCacheKeys } from "../../app/services/cache-service";
import { toMessageDetailResponse, toMessageListResponse } from "../../app/routes/dto/mailbox-dto";
import { toOutboundListResponse, toQuotaResponse } from "../../app/routes/dto/outbound-dto";
import { parseOutboundSendRequest } from "../../app/routes/requests/outbound-request";
import {
  getMessageAttachmentUseCase,
  getMessageDetailUseCase,
  listMessagesUseCase
} from "../../app/use-cases/message-use-cases";
import {
  getOutboundMessageDetail,
  listOutboundMessages,
  sendOutboundMessageUseCase
} from "../../app/use-cases/outbound-use-cases";

const messageFilters = new Set<MessageFilter>(["all", "code", "link", "attachment", "unparsed"]);
const outboundStatuses = new Set<OutboundListStatus>(["all", "sent", "failed"]);

type QueryRequestContext = {
  req: {
    query: (name: string) => string | undefined;
  };
};

function parsePositiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.trunc(parsed), maximum);
}

function parseMessageFilter(value: string | undefined): MessageFilter {
  if (!value) return "all";
  return messageFilters.has(value as MessageFilter) ? (value as MessageFilter) : "all";
}

function parseMessageListQuery(c: QueryRequestContext) {
  const search = c.req.query("search")?.trim();

  return {
    mailboxId: c.req.query("accountId") ?? c.req.query("mailboxId") ?? null,
    page: parsePositiveInteger(c.req.query("page"), 1, 10_000),
    pageSize: parsePositiveInteger(c.req.query("pageSize"), 10, 100),
    filter: parseMessageFilter(c.req.query("filter")),
    ...(search ? { search } : {})
  };
}

function parseOutboundStatus(value: string | undefined): OutboundListStatus {
  if (!value) return "all";
  return outboundStatuses.has(value as OutboundListStatus) ? (value as OutboundListStatus) : "all";
}

function parseOutboundListQuery(c: QueryRequestContext) {
  const search = c.req.query("search")?.trim();

  return {
    mailboxId: c.req.query("accountId") ?? c.req.query("mailboxId") ?? null,
    page: parsePositiveInteger(c.req.query("page"), 1, 10_000),
    pageSize: parsePositiveInteger(c.req.query("pageSize"), 6, 100),
    status: parseOutboundStatus(c.req.query("status")),
    ...(search ? { search } : {})
  };
}

function buildAttachmentContentDisposition(filename: string) {
  const lineBreakIndex = Math.min(
    ...[filename.indexOf("\r"), filename.indexOf("\n")].filter((index) => index >= 0)
  );
  const headerSafeSegment = lineBreakIndex === Infinity ? filename : filename.slice(0, lineBreakIndex);
  const normalizedFilename = Array.from(headerSafeSegment)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    })
    .join("")
    .trim() || "attachment";
  const fallbackFilename = normalizedFilename
    .replace(/[^\x20-\x7E]+/g, "_")
    .replace(/["\\;]/g, "_")
    .trim() || "attachment";

  return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(normalizedFilename)}`;
}

export function registerMailRoutes(app: Hono<AppContext>) {
  app.get("/api/mail/messages", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const result = await listMessagesUseCase(getAppServices(c), {
      userId: user.id,
      userRole: user.role,
      ...parseMessageListQuery(c)
    });
    if (result instanceof Response) return result;

    return c.json(toMessageListResponse(result));
  });

  app.get("/api/mail/messages/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const message = await getMessageDetailUseCase(getAppServices(c), {
      userId: user.id,
      userRole: user.role,
      messageId: c.req.param("id")
    });
    if (message instanceof Response) return message;

    return c.json(toMessageDetailResponse(message));
  });

  app.get("/api/mail/messages/:messageId/attachments/:attachmentId", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const result = await getMessageAttachmentUseCase(getAppServices(c), {
      userId: user.id,
      userRole: user.role,
      messageId: c.req.param("messageId"),
      attachmentId: c.req.param("attachmentId")
    });
    if (result instanceof Response) return result;

    const { attachment } = result;
    if (!c.env.ATTACHMENTS) return c.json({ attachment });
    const object = await c.env.ATTACHMENTS.get(attachment.key);
    if (!object) return jsonError("Attachment missing", 404);
    return new Response(object.body, {
      headers: {
        "content-type": attachment.contentType,
        "content-disposition": buildAttachmentContentDisposition(attachment.filename)
      }
    });
  });

  app.get("/api/mail/outbound", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const query = parseOutboundListQuery(c);
    if (!query.mailboxId) return jsonError("accountId is required");
    const result = await listOutboundMessages(getAppServices(c), {
      userId: user.id,
      userRole: user.role,
      mailboxId: query.mailboxId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      ...(query.search ? { search: query.search } : {})
    });
    if (result instanceof Response) return result;
    return c.json(toOutboundListResponse(result));
  });

  app.get("/api/mail/outbound/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const message = await getOutboundMessageDetail(getAppServices(c), {
      userId: user.id,
      userRole: user.role,
      messageId: c.req.param("id")
    });
    if (message instanceof Response) return message;
    return c.json({ message });
  });

  app.post("/api/mail/send", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    if (!c.get("featureToggles").outboundEnabled) return jsonError("Outbound sending disabled", 403);
    let outboundPayload: Awaited<ReturnType<typeof parseOutboundSendRequest>>;
    try {
      outboundPayload = await parseOutboundSendRequest(c.req.raw);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid outbound payload", 400);
    }

    const quota = await sendOutboundMessageUseCase(getAppServices(c), {
      userId: user.id,
      mailboxId: outboundPayload.mailboxId,
      toAddress: outboundPayload.toAddress,
      subject: outboundPayload.subject,
      bodyText: outboundPayload.bodyText
    });
    if (quota instanceof Response) return quota;
    return c.json(toQuotaResponse(quota satisfies Pick<QuotaSummary, "dailyLimit" | "sendsToday" | "disabled">));
  });

  app.get("/api/mail/settings", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const settings = await cachedJson(c.env.CACHE, CACHE_KEYS.mailSettings, CACHE_TTL_SECONDS.settings, async () =>
      parseMailSettingsRecord(await c.get("store").mailSettings.get())
    );
    return c.json({ settings });
  });

  app.put("/api/mail/settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const current = parseMailSettingsRecord(await c.get("store").mailSettings.get());
    let payload: ReturnType<typeof parseMailSettingsUpdatePayload>;
    try {
      payload = parseMailSettingsUpdatePayload(await c.req.json(), current);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    const next = toPersistableMailSettings(payload, current);
    if (next.routing.webhookEnabled) {
      const endpoints = await c.get("store").webhookEndpoints.listByUser(user.id);
      const hasEnabledEndpoint = endpoints.some((endpoint) => endpoint.id === next.routing.webhookEndpoint && endpoint.enabled);
      if (!hasEnabledEndpoint) return jsonError("An enabled configured webhook endpoint is required", 400);
    }
    if (next.routing.telegramEnabled) {
      const subscription = await c.get("store").telegram.findByUserId(user.id);
      if (!subscription?.enabled || subscription.chatId !== next.routing.telegramTarget) {
        return jsonError("An enabled Telegram target is required", 400);
      }
    }
    const record = await c.get("store").mailSettings.save({
      senderRulesJson: JSON.stringify(next.senderRules),
      routingJson: JSON.stringify(next.routing),
      workspaceDefaultsJson: JSON.stringify(next.workspaceDefaults)
    });
    await recordAudit(c.get("store"), "user", user.id, "mail-settings-update", {
      sections: Object.keys(payload)
    });
    await deleteCacheKeys(c.env.CACHE, [CACHE_KEYS.mailSettings]);
    return c.json({ settings: parseMailSettingsRecord(record) });
  });
}
