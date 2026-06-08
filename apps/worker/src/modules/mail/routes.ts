import type { Hono } from "hono";
import type { QuotaSummary } from "@wemail/shared";

import type { AppContext } from "../../app/context";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import { toMessageDetailResponse, toMessageListResponse } from "../../app/routes/dto/mailbox-dto";
import { toOutboundListResponse, toQuotaResponse } from "../../app/routes/dto/outbound-dto";
import { parseOutboundSendRequest } from "../../app/routes/requests/outbound-request";
import {
  getMessageAttachmentUseCase,
  getMessageDetailUseCase,
  listMailboxMessagesUseCase
} from "../../app/use-cases/message-use-cases";
import { listOutboundMessages, sendOutboundMessageUseCase } from "../../app/use-cases/outbound-use-cases";

const defaultMailSettings = {
  senderRules: {
    defaultIdentity: "WeMail QA <qa@example.com>",
    signature: "Sent from the WeMail QA workspace.",
    retryEnabled: true,
    retryAttempts: "2 次",
    retryDelay: "5 分钟",
    failureRetention: "30 天",
    allowManualOverride: true
  },
  routing: {
    webhookEnabled: true,
    webhookEndpoint: "https://hooks.example.com/wemail",
    telegramEnabled: true,
    telegramTarget: "Telegram Chat 123456",
    failureAlerts: true,
    exceptionAlerts: true,
    exceptionStrategy: "异常 / 无匹配邮件进入发件箱异常视图",
    fallbackOwner: "QA 值班邮箱"
  },
  workspaceDefaults: {
    defaultMailRoute: "/mail/outbound",
    outboundDefaultFilter: "异常 / 无匹配",
    expandExceptionsByDefault: true,
    listDensity: "舒适",
    openLatestFailureFirst: true
  },
  lastUpdatedLabel: "尚未更新"
};

function parseMailSettings(record: Awaited<ReturnType<AppContext["Variables"]["store"]["mailSettings"]["get"]>>) {
  if (!record) return defaultMailSettings;
  return {
    senderRules: JSON.parse(record.senderRulesJson),
    routing: JSON.parse(record.routingJson),
    workspaceDefaults: JSON.parse(record.workspaceDefaultsJson),
    lastUpdatedLabel: record.updatedAt
  };
}

export function registerMailRoutes(app: Hono<AppContext>) {
  app.get("/api/mail/messages", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const mailboxId = c.req.query("accountId") ?? c.req.query("mailboxId");
    if (!mailboxId) return jsonError("accountId is required");

    const messages = await listMailboxMessagesUseCase(getAppServices(c), {
      userId: user.id,
      mailboxId
    });
    if (messages instanceof Response) return messages;

    return c.json(toMessageListResponse(messages));
  });

  app.get("/api/mail/messages/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const message = await getMessageDetailUseCase(getAppServices(c), {
      userId: user.id,
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
        "content-disposition": `attachment; filename="${attachment.filename}"`
      }
    });
  });

  app.get("/api/mail/outbound", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const mailboxId = c.req.query("accountId") ?? c.req.query("mailboxId");
    if (!mailboxId) return jsonError("accountId is required");
    const messages = await listOutboundMessages(getAppServices(c), { userId: user.id, mailboxId });
    if (messages instanceof Response) return messages;
    return c.json(toOutboundListResponse(messages));
  });

  app.post("/api/mail/send", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    if (!c.get("featureToggles").outboundEnabled) return jsonError("Outbound sending disabled", 403);
    const { mailboxId, toAddress, subject, bodyText } = await parseOutboundSendRequest(c.req.raw);

    const quota = await sendOutboundMessageUseCase(getAppServices(c), {
      userId: user.id,
      mailboxId,
      toAddress,
      subject,
      bodyText
    });
    if (quota instanceof Response) return quota;
    return c.json(toQuotaResponse(quota satisfies Pick<QuotaSummary, "dailyLimit" | "sendsToday" | "disabled">));
  });

  app.get("/api/mail/settings", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    return c.json({ settings: parseMailSettings(await c.get("store").mailSettings.get()) });
  });

  app.put("/api/mail/settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const payload = (await c.req.json()) as Partial<typeof defaultMailSettings>;
    const current = parseMailSettings(await c.get("store").mailSettings.get());
    const next = {
      senderRules: payload.senderRules ?? current.senderRules,
      routing: payload.routing ?? current.routing,
      workspaceDefaults: payload.workspaceDefaults ?? current.workspaceDefaults
    };
    const record = await c.get("store").mailSettings.save({
      senderRulesJson: JSON.stringify(next.senderRules),
      routingJson: JSON.stringify(next.routing),
      workspaceDefaultsJson: JSON.stringify(next.workspaceDefaults)
    });
    await recordAudit(c.get("store"), "user", user.id, "mail-settings-update", {});
    return c.json({ settings: parseMailSettings(record) });
  });
}
