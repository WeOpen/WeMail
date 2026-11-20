import {
  parseMailSettingsRecord,
  type FeatureToggles,
  type MailDomainSummary,
  type OutboundDnsCheckSummary,
  type OutboundListStatus,
  type OutboundMaturitySummary,
  type OutboundSenderIdentitySummary,
  type OutboundTemplateSummary,
  type UserRole
} from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { jsonError, recordAudit } from "../services/audit-service";
import {
  getMailDomains,
  getResolvedApiDailyLimit,
  getResolvedOutboundLimit
} from "../services/config-service";
import { getOwnedMailbox } from "../services/mailbox-access-service";
import { hashString } from "../../shared/auth";
import { processOutboundSends } from "../services/outbound-delivery-service";

type OutboundUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "outboundEnabled">;
  env: AppBindings;
};


function parseRetryAttemptCount(value: string) {
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Math.max(0, Number.parseInt(match[0], 10));
}

function appendSignature(bodyText: string, signature: string) {
  const normalizedSignature = signature.trim();
  if (!normalizedSignature) return bodyText;

  const normalizedBodyText = bodyText.trimEnd();
  if (!normalizedBodyText) return normalizedSignature;
  return `${normalizedBodyText}\n\n${normalizedSignature}`;
}


async function getVisibleMailbox(
  context: OutboundUseCaseContext,
  payload: { userId: string; userRole: UserRole; mailboxId: string }
) {
  if (payload.userRole === "admin") return context.store.mailboxes.findById(payload.mailboxId);
  return getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
}


function parseIdentityAddress(identity: string) {
  const bracketMatch = identity.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  if (bracketMatch) return bracketMatch[1].trim().toLowerCase();

  const directAddress = identity.trim().match(/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/);
  return directAddress ? directAddress[0].toLowerCase() : "";
}

function getEmailDomain(address: string) {
  const [, domain] = address.toLowerCase().split("@");
  return domain?.trim() || null;
}

function buildIdentitySummary(input: {
  id: string;
  label: string;
  identity: string;
  configuredDomains: Set<string>;
  isDefault: boolean;
}): OutboundSenderIdentitySummary {
  const address = parseIdentityAddress(input.identity);
  const domain = getEmailDomain(address);

  if (!address || !domain) {
    return {
      id: input.id,
      label: input.label,
      address: input.identity,
      domain: null,
      isDefault: input.isDefault,
      status: "error",
      message: "发信身份不是有效邮箱地址"
    };
  }

  if (domain === "example.com") {
    return {
      id: input.id,
      label: input.label,
      address,
      domain,
      isDefault: input.isDefault,
      status: "warning",
      message: "仍在使用示例域名，生产环境需要换成真实域名"
    };
  }

  if (!input.configuredDomains.has(domain)) {
    return {
      id: input.id,
      label: input.label,
      address,
      domain,
      isDefault: input.isDefault,
      status: "warning",
      message: "该域名不在系统可用邮箱域名列表中，需在 Resend 单独验证"
    };
  }

  return {
    id: input.id,
    label: input.label,
    address,
    domain,
    isDefault: input.isDefault,
    status: "ok",
    message: "身份域名与系统邮箱域名一致"
  };
}

function buildDnsChecks(input: {
  domain: string;
  resendConfigured: boolean;
  featureEnabled: boolean;
}): OutboundDnsCheckSummary[] {
  const baseStatus = !input.featureEnabled ? "warning" : input.resendConfigured ? "warning" : "error";
  const baseMessage = !input.featureEnabled
    ? "发件功能已关闭，开启前先完成 DNS 核对"
    : input.resendConfigured
      ? "已配置 Resend API Key，请以 Resend 域名验证页面的实际记录为准"
      : "发件功能已开启但 Resend API Key 未配置，DNS 校验无法完成";

  return [
    {
      id: "spf",
      source: "configuration", checkedAt: null,
      label: "SPF",
      domain: input.domain,
      recordType: "TXT",
      expectedValue: "以供应商给出的具体子域与 SPF 记录为准",
      status: baseStatus,
      message: baseMessage
    },
    {
      id: "dkim",
      source: "configuration", checkedAt: null,
      label: "DKIM",
      domain: input.domain,
      recordType: "TXT",
      expectedValue: "使用供应商为该域名生成的实际 DKIM 记录",
      status: baseStatus,
      message: baseMessage
    },
    {
      id: "dmarc",
      source: "configuration", checkedAt: null,
      label: "DMARC",
      domain: `_dmarc.${input.domain}`,
      recordType: "TXT",
      expectedValue: `v=DMARC1; p=none; rua=mailto:postmaster@${input.domain}`,
      status: input.featureEnabled ? "warning" : "warning",
      message: "建议先使用 p=none 观察，再按投递稳定性逐步收紧策略"
    }
  ];
}

function buildOutboundTemplates(): OutboundTemplateSummary[] {
  return [
    {
      id: "verification-forward",
      name: "验证码转发",
      description: "把识别到的验证码或登录链接转发给指定成员。",
      subject: "验证码通知：{{code}}",
      bodyText: "你好，\n\n收到新的验证码：{{code}}\n来源：{{source}}\n\n请在有效期内完成验证。"
    },
    {
      id: "service-notice",
      name: "服务通知",
      description: "用于发送账号、服务或项目状态变更。",
      subject: "服务通知：{{title}}",
      bodyText: "你好，\n\n{{title}}\n\n{{summary}}\n\n如需更多信息，请回复这封邮件。"
    },
    {
      id: "delivery-retry",
      name: "失败补发说明",
      description: "发信失败后补发给同一收件人并附带简要说明。",
      subject: "邮件补发：{{subject}}",
      bodyText: "你好，\n\n上一封邮件可能没有成功送达，这里重新发送一次。\n\n{{content}}"
    }
  ];
}

function resolvePrimaryMailDomain(domains: MailDomainSummary[]) {
  return domains[0]?.domain ?? "example.com";
}

async function summarizeOutboundFailures(context: OutboundUseCaseContext, mailboxIds: string[]) {
  if (mailboxIds.length === 0) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      recentFailureReason: null
    };
  }

  const [allSummaries, failureSummaries] = await Promise.all([
    Promise.all(
      mailboxIds.map((mailboxId) =>
        context.store.outboundMessages.listByMailbox({
          mailboxId,
          page: 1,
          pageSize: 1
        })
      )
    ),
    Promise.all(
      mailboxIds.map((mailboxId) =>
        context.store.outboundMessages.listByMailbox({
          mailboxId,
          page: 1,
          pageSize: 1,
          status: "failed"
        })
      )
    )
  ]);

  const stats = allSummaries.reduce(
    (summary, result) => ({
      total: summary.total + result.summary.totalCount,
      sent: summary.sent + result.summary.sentCount,
      failed: summary.failed + result.summary.failedCount
    }),
    { total: 0, sent: 0, failed: 0 }
  );
  const recentFailure = failureSummaries
    .flatMap((result) => result.messages)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return {
    ...stats,
    recentFailureReason: recentFailure?.errorText ?? null
  };
}

export async function getOutboundMaturityUseCase(
  context: OutboundUseCaseContext,
  payload: { userId: string }
): Promise<OutboundMaturitySummary> {
  const config = resolveAppConfig(context.env);
  const [mailSettings, mailDomains, outboundLimit, apiDailyLimit, mailboxes] = await Promise.all([
    context.store.mailSettings.get().then(parseMailSettingsRecord),
    getMailDomains(context.store, context.env),
    getResolvedOutboundLimit(context.store, context.env),
    getResolvedApiDailyLimit(context.store, context.env),
    context.store.mailboxes.listByUser(payload.userId)
  ]);
  const primaryDomain = resolvePrimaryMailDomain(mailDomains);
  const fallbackSenderIdentity = config.outbound.resendFrom ?? `${config.appName} <no-reply@${primaryDomain}>`;
  const defaultIdentity = mailSettings.senderRules.defaultIdentity.trim() || fallbackSenderIdentity;
  const defaultAddress = parseIdentityAddress(defaultIdentity);
  const defaultDomain = getEmailDomain(defaultAddress) ?? primaryDomain;
  const configuredDomains = new Set(mailDomains.map((domain) => domain.domain.toLowerCase()));
  const quota = await context.store.quotas.getByUserId(payload.userId, outboundLimit, apiDailyLimit);
  const failureStats = await summarizeOutboundFailures(context, mailboxes.map((mailbox) => mailbox.id));

  return {
    generatedAt: new Date().toISOString(),
    featureEnabled: context.featureToggles.outboundEnabled,
    resendConfigured: Boolean(config.integrations.resendApiKey),
    defaultIdentity,
    quota,
    retryPolicy: {
      enabled: mailSettings.senderRules.retryEnabled,
      attempts: mailSettings.senderRules.retryAttempts,
      delay: mailSettings.senderRules.retryDelay,
      failureRetention: mailSettings.senderRules.failureRetention
    },
    failureStats,
    returnPath: {
      status: "warning",
      message: config.integrations.resendApiKey
        ? "已配置发送凭据；Return-Path 与最终退信状态需由真实供应商事件确认。"
        : "配置 RESEND_API_KEY 后才能确认 Return-Path 和退信链路。"
    },
    identities: [
      buildIdentitySummary({
        id: "default",
        label: "默认发信身份",
        identity: defaultIdentity,
        configuredDomains,
        isDefault: true
      }),
      ...mailboxes.map((mailbox) =>
        buildIdentitySummary({
          id: mailbox.id,
          label: mailbox.label,
          identity: mailbox.address,
          configuredDomains,
          isDefault: false
        })
      )
    ],
    dnsChecks: buildDnsChecks({
      domain: defaultDomain,
      resendConfigured: Boolean(config.integrations.resendApiKey),
      featureEnabled: context.featureToggles.outboundEnabled
    }),
    templates: buildOutboundTemplates()
  };
}

export async function listOutboundMessages(
  context: OutboundUseCaseContext,
  payload: {
    userId: string;
    userRole: UserRole;
    mailboxId: string;
    page: number;
    pageSize: number;
    search?: string;
    status?: OutboundListStatus;
  }
) {
  const mailbox = await getVisibleMailbox(context, payload);
  if (!mailbox) return jsonError("Mailbox not found", 404);
  return context.store.outboundMessages.listByMailbox({
    mailboxId: mailbox.id,
    page: payload.page,
    pageSize: payload.pageSize,
    status: payload.status ?? "all",
    ...(payload.search ? { search: payload.search } : {})
  });
}

export async function getOutboundMessageDetail(
  context: OutboundUseCaseContext,
  payload: { userId: string; userRole: UserRole; messageId: string }
) {
  const message = await context.store.outboundMessages.findById(payload.messageId);
  if (!message) return jsonError("Outbound message not found", 404);

  const mailbox = await getVisibleMailbox(context, {
    userId: payload.userId,
    userRole: payload.userRole,
    mailboxId: message.mailboxId
  });
  if (!mailbox) return jsonError("Outbound message not found", 404);

  return { ...message, timeline: await context.store.outboundSends.timeline(message.id) };
}

export async function sendOutboundMessageUseCase(
  context: OutboundUseCaseContext,
  payload: { userId: string; mailboxId: string; toAddress: string; subject: string; bodyText: string; requestId?: string }
) {
  if (!context.featureToggles.outboundEnabled) {
    return jsonError("Outbound sending disabled", 403);
  }

  const mailbox = await getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);

  const config = resolveAppConfig(context.env);
  const [primaryDomain] = await getMailDomains(context.store, context.env);
  const requestId = payload.requestId ?? crypto.randomUUID();
  const requestHash = await hashString(JSON.stringify({ mailboxId: payload.mailboxId, toAddress: payload.toAddress, subject: payload.subject, bodyText: payload.bodyText }));
  const existing = await context.store.outboundSends.findByUserAndKey(payload.userId, requestId);
  if (!existing && !config.integrations.resendApiKey) return jsonError("Resend not configured", 503);
  const [outboundLimit, apiDailyLimit] = await Promise.all([
    getResolvedOutboundLimit(context.store, context.env),
    getResolvedApiDailyLimit(context.store, context.env)
  ]);
  const mailSettings = parseMailSettingsRecord(await context.store.mailSettings.get());
  const fallbackSenderIdentity = config.outbound.resendFrom ?? `${config.appName} <no-reply@${primaryDomain.domain}>`;
  const senderIdentity = mailSettings.senderRules.defaultIdentity.trim() || fallbackSenderIdentity;
  const text = appendSignature(payload.bodyText, mailSettings.senderRules.signature);
  const retryCount = mailSettings.senderRules.retryEnabled ? parseRetryAttemptCount(mailSettings.senderRules.retryAttempts) : 0;

  const resendPayload = {
    from: senderIdentity,
    to: payload.toAddress,
    subject: payload.subject,
    text
  };
  const record = existing ?? await context.store.outboundSends.accept({
    userId: payload.userId, requestId, requestHash,
    mailboxId: payload.mailboxId,
    fromAddress: senderIdentity,
    toAddress: payload.toAddress,
    subject: payload.subject,
    bodyText: payload.bodyText,
    requestPayloadJson: JSON.stringify(resendPayload),
    maxAttempts: Math.min(retryCount + 1, 4),
    retryDelayMs: mailSettings.senderRules.retryDelay === "立即重试" ? 0 : (Number.parseInt(mailSettings.senderRules.retryDelay, 10) || 5) * 60_000
  }, { dailyLimit: outboundLimit, apiDailyLimit });
  if (!record) return jsonError("Outbound quota exhausted", 403);
  if (record.requestHash !== requestHash) return jsonError("Idempotency key was already used with different content", 409);
  if (record.status === "queued") await processOutboundSends(context.store, context.env, { id: record.id, userId: payload.userId, limit: 1 });
  const latest = (await context.store.outboundSends.findByUserAndKey(payload.userId, requestId))!;
  const quota = await context.store.quotas.getByUserId(payload.userId, outboundLimit, apiDailyLimit);
  if (!existing) await recordAudit(context.store, "user", payload.userId, "outbound-send", { mailboxId: payload.mailboxId, messageId: record.id, status: latest.status });
  if (latest.status === "failed") return jsonError(latest.errorText ?? "Failed to send", 502);
  return {
    dailyLimit: quota.dailyLimit,
    sendsToday: quota.sendsToday,
    disabled: quota.disabled,
    message: { id: latest.id, status: latest.status, nextAttemptAt: latest.status === "queued" ? latest.nextAttemptAt : null }
  };
}
