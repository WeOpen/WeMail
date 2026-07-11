import type { Context, Hono } from "hono";
import type {
  DataReliabilitySummary,
  FeatureToggles,
  ProductMaturityArea,
  ProductMaturitySignal,
  ProductMaturitySummary,
  RuntimeSettingsUpdateInput,
  SystemDiagnosticCheck,
  SystemDiagnosticStatus,
  SystemDiagnosticsSummary
} from "@wemail/shared";

import type { AppContext } from "../../app/context";
import type { AppStore, UserRecord } from "../../core/bindings";
import { getAppServices, requireSessionAuth, requireUser } from "../../app/context";
import { resolveAppConfig } from "../../core/config";
import { jsonError } from "../../app/services/audit-service";
import { CACHE_KEYS, CACHE_TTL_SECONDS, cachedJson, deleteCacheKeys } from "../../app/services/cache-service";
import { defaultFeatureToggles } from "../../app/services/config-service";
import { getRuntimeSettings, updateRuntimeSettings } from "../../app/services/runtime-settings-service";
import {
  getMailDomainSettingsUseCase,
  updateFeatureTogglesUseCase,
  updateMailDomainsUseCase
} from "../../app/use-cases/settings-use-cases";

function resolveOverallStatus(checks: Array<{ status: SystemDiagnosticStatus }>): SystemDiagnosticStatus {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "ok";
}

function isProductionLike(environment: string) {
  return environment !== "local";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function makeSignal(label: string, value: string | number, status?: SystemDiagnosticStatus): ProductMaturitySignal {
  return {
    label,
    value: typeof value === "number" ? formatCount(value) : value,
    status
  };
}

function hasDiagnosticsIssue(diagnostics: SystemDiagnosticsSummary, status: SystemDiagnosticStatus) {
  return diagnostics.checks.filter((check) => check.status === status).length;
}

async function buildSystemDiagnostics(c: Context<AppContext>): Promise<SystemDiagnosticsSummary> {
  const config = resolveAppConfig(c.env);
  const productionLike = isProductionLike(config.environment);
  const mailSettings = await getMailDomainSettingsUseCase(getAppServices(c), c.env);
  const checks: SystemDiagnosticCheck[] = [
    {
      id: "runtime.environment",
      label: "运行环境",
      status: "ok",
      message: `当前环境：${config.environment}`
    },
    {
      id: "cookie.secure",
      label: "Cookie Secure",
      status: productionLike && !config.cookie.secure ? "error" : "ok",
      message: productionLike && !config.cookie.secure ? "Cookie Secure 未开启" : "Cookie Secure 配置正常",
      action: productionLike && !config.cookie.secure ? "生产和预发布环境应设置 COOKIE_SECURE=true。" : undefined
    },
    {
      id: "cors.origins",
      label: "CORS 来源",
      status: productionLike && config.cors.allowedOrigins.length === 0 ? "error" : "ok",
      message: productionLike && config.cors.allowedOrigins.length === 0 ? "CORS 来源未配置" : `${config.cors.allowedOrigins.length} 个允许来源`,
      action: productionLike && config.cors.allowedOrigins.length === 0 ? "配置 CORS_ALLOWED_ORIGINS 为前端站点域名。" : undefined
    },
    {
      id: "mail.domains",
      label: "邮箱域名",
      status:
        mailSettings.domains.length === 0
          ? "error"
          : productionLike && mailSettings.primaryDomain === "example.com"
            ? "warning"
            : "ok",
      message:
        mailSettings.domains.length === 0
          ? "尚未配置邮箱域名"
          : productionLike && mailSettings.primaryDomain === "example.com"
            ? "仍在使用 example.com 默认域名"
            : `默认域名：${mailSettings.primaryDomain}`,
      action:
        mailSettings.domains.length === 0 || (productionLike && mailSettings.primaryDomain === "example.com")
          ? "进入系统设置，将默认域名改为 Cloudflare Email Routing 的真实域名。"
          : undefined
    },
    {
      id: "outbound.resend",
      label: "Resend 发信",
      status: config.features.outboundEnabled && !config.integrations.resendApiKey ? "warning" : "ok",
      message:
        config.features.outboundEnabled && !config.integrations.resendApiKey
          ? "发件功能已开启但 RESEND_API_KEY 未配置"
          : config.features.outboundEnabled
            ? "发件密钥已配置"
            : "发件功能已关闭",
      action:
        config.features.outboundEnabled && !config.integrations.resendApiKey
          ? "配置 RESEND_API_KEY，或在功能开关里关闭发件能力。"
          : undefined
    },
    {
      id: "telegram.bot_token",
      label: "Telegram Bot Token",
      status: config.features.telegramEnabled && !config.integrations.telegramBotToken ? "error" : "ok",
      message:
        config.features.telegramEnabled && !config.integrations.telegramBotToken
          ? "Telegram 已开启但 Bot Token 未配置"
          : config.features.telegramEnabled
            ? "Bot Token 已配置"
            : "Telegram 功能已关闭",
      action:
        config.features.telegramEnabled && !config.integrations.telegramBotToken
          ? "配置 TELEGRAM_BOT_TOKEN，或在功能开关里关闭 Telegram。"
          : undefined
    },
    {
      id: "telegram.webhook_secret",
      label: "Telegram Webhook Secret",
      status:
        config.features.telegramEnabled && productionLike && !config.integrations.telegramWebhookSecret ? "error" : "ok",
      message:
        config.features.telegramEnabled && productionLike && !config.integrations.telegramWebhookSecret
          ? "Telegram Webhook Secret 未配置"
          : config.features.telegramEnabled
            ? "Webhook Secret 配置正常"
            : "Telegram 功能已关闭",
      action:
        config.features.telegramEnabled && productionLike && !config.integrations.telegramWebhookSecret
          ? "配置 TELEGRAM_WEBHOOK_SECRET，并在 Telegram 设置页重新配置 Webhook。"
          : undefined
    },
    {
      id: "oauth.github",
      label: "GitHub OAuth",
      status: config.oauth.providers.github ? "ok" : "warning",
      message: config.oauth.providers.github ? "GitHub OAuth 已配置" : "GitHub OAuth 未配置",
      action: config.oauth.providers.github ? undefined : "如需 GitHub 快捷登录，配置 GitHub OAuth client 与 callback URL。"
    },
    {
      id: "oauth.linuxdo",
      label: "LinuxDo OAuth",
      status: config.oauth.providers.linuxdo ? "ok" : "warning",
      message: config.oauth.providers.linuxdo ? "LinuxDo OAuth 已配置" : "LinuxDo OAuth 未配置",
      action: config.oauth.providers.linuxdo ? undefined : "如需 LinuxDo 快捷登录，配置 LinuxDo OAuth client 与 callback URL。"
    }
  ];

  return {
    appName: config.appName,
    environment: config.environment,
    generatedAt: new Date().toISOString(),
    overallStatus: resolveOverallStatus(checks),
    checks
  };
}

async function collectAllUsers(store: AppStore) {
  const summary = await store.users.summary();
  const pageSize = 100;
  const pages = Math.max(1, Math.ceil(summary.total / pageSize));
  const batches = await Promise.all(
    Array.from({ length: pages }, (_, index) =>
      store.users.list({
        page: index + 1,
        pageSize
      })
    )
  );
  return batches.flatMap((batch) => batch.users);
}

async function countWebhookState(store: AppStore, users: UserRecord[]) {
  const endpointBatches = await Promise.all(users.map((user) => store.webhookEndpoints.listByUser(user.id)));
  const endpoints = endpointBatches.flat();
  const deliveryBatches = await Promise.all(users.map((user) => store.webhookDeliveries.listByUser(user.id)));
  const deliveries = deliveryBatches.flat();

  return {
    activeEndpoints: endpoints.filter((endpoint) => endpoint.enabled).length,
    deliveries: deliveries.length,
    failedDeliveries: deliveries.filter((delivery) => delivery.status !== "success").length,
    totalEndpoints: endpoints.length
  };
}

async function countNotificationRuleState(store: AppStore, users: UserRecord[]) {
  const ruleBatches = await Promise.all(users.map((user) => store.notificationRules.listByUser(user.id)));
  const rules = ruleBatches.flat();
  return {
    active: rules.filter((rule) => rule.enabled).length,
    total: rules.length
  };
}

async function countApiKeyState(store: AppStore, users: UserRecord[]) {
  const keyBatches = await Promise.all(users.map((user) => store.apiKeys.listByUser(user.id)));
  const keys = keyBatches.flat();
  return {
    active: keys.filter((key) => !key.revokedAt).length,
    revoked: keys.filter((key) => Boolean(key.revokedAt)).length,
    total: keys.length
  };
}

async function countTelegramState(store: AppStore, users: UserRecord[]) {
  const subscriptions = await Promise.all(users.map((user) => store.telegram.findByUserId(user.id)));
  return {
    active: subscriptions.filter((subscription) => subscription?.enabled).length,
    total: subscriptions.filter(Boolean).length
  };
}

async function countOutboundState(store: AppStore, mailboxIds: string[]) {
  if (mailboxIds.length === 0) {
    return {
      failed: 0,
      sent: 0,
      total: 0
    };
  }

  const summaries = await Promise.all(
    mailboxIds.map((mailboxId) =>
      store.outboundMessages.listByMailbox({
        mailboxId,
        page: 1,
        pageSize: 1
      })
    )
  );

  return summaries.reduce(
    (stats, result) => ({
      failed: stats.failed + result.summary.failedCount,
      sent: stats.sent + result.summary.sentCount,
      total: stats.total + result.summary.totalCount
    }),
    { failed: 0, sent: 0, total: 0 }
  );
}

const knownMigrationSummaries = [
  ["0001", "基础菜单与邮件域模型", "初始化用户、邮箱、邮件、附件、配额和审计表。"],
  ["0007", "外发邮件详情", "保存发件请求、Provider 响应、失败原因和消息 ID。"],
  ["0011", "API 调用配额", "增加 API 每日调用上限和使用量。"],
  ["0014", "API Key scopes", "为 API Key 增加权限范围。"],
  ["0015", "会话设备与邀请码策略", "记录设备会话、登录历史、邀请码有效期和目标角色。"],
  ["0016", "通知规则", "持久化通知规则和投递抑制条件。"],
  ["0017", "清理任务运行记录", "记录定时清理任务成功/失败和删除数量。"]
] as const;

async function buildDataReliability(c: Context<AppContext>): Promise<DataReliabilitySummary> {
  const config = resolveAppConfig(c.env);
  const store = c.get("store");
  const generatedAt = new Date().toISOString();
  const [expiredMessages, cleanupRuns] = await Promise.all([
    store.messages.listExpired(generatedAt),
    store.cleanupRuns.listRecent(8)
  ]);
  const hasDb = Boolean(c.env.DB) || config.environment === "local";
  const hasR2 = Boolean(c.env.ATTACHMENTS);
  const hasFailedCleanup = cleanupRuns.some((run) => run.status === "failed");
  const status = !hasDb ? "error" : hasFailedCleanup || expiredMessages.length > 0 || !hasR2 ? "warning" : "ok";

  return {
    generatedAt,
    status,
    storage: {
      d1: hasDb ? "ok" : "error",
      r2: hasR2 ? "ok" : "warning",
      message: hasDb
        ? hasR2
          ? "D1 和 R2 绑定可用"
          : "D1 可用，R2 附件绑定未检测到"
        : "D1 绑定缺失，生产环境无法持久化邮件"
    },
    migrations: knownMigrationSummaries.map(([id, title, description]) => ({
      id,
      title,
      status: "ok",
      description
    })),
    cleanup: {
      expiredMessages: expiredMessages.length,
      recentRuns: cleanupRuns
    },
    idempotency: {
      enabled: true,
      duplicateWindowMinutes: 5,
      duplicateNotificationPrevention: true,
      message: "同一邮箱 5 分钟内的同发件人、主题、收件人和正文预览会复用已有记录，并抑制重复通知。"
    },
    backupRunbook: [
      {
        title: "导出 D1 备份",
        command: "pnpm exec wrangler d1 export <database> --remote --output backup.sql",
        cadence: "每日或每次发布前"
      },
      {
        title: "恢复 D1 备份",
        command: "pnpm exec wrangler d1 execute <database> --remote --file backup.sql",
        cadence: "故障恢复时"
      },
      {
        title: "核对 R2 附件",
        command: "pnpm exec wrangler r2 object list <bucket> --remote --prefix attachments/",
        cadence: "每周"
      }
    ]
  };
}

async function buildProductMaturity(c: Context<AppContext>): Promise<ProductMaturitySummary> {
  const store = c.get("store");
  const config = resolveAppConfig(c.env);
  const diagnostics = await buildSystemDiagnostics(c);
  const [users, mailboxPage, allMailboxes, invites] = await Promise.all([
    collectAllUsers(store),
    store.mailboxes.listPage({ page: 1, pageSize: 1 }),
    store.mailboxes.listAll(),
    store.invites.listPage({ page: 1, pageSize: 1 })
  ]);
  const mailboxIds = allMailboxes.map((mailbox) => mailbox.id);
  const [messages, expiredMessages, cleanupRuns, apiKeys, webhook, notificationRules, telegram, outbound] = await Promise.all([
    store.messages.listForMailboxes({
      mailboxIds,
      includeUnmatched: true,
      page: 1,
      pageSize: 1
    }),
    store.messages.listExpired(new Date().toISOString()),
    store.cleanupRuns.listRecent(5),
    countApiKeyState(store, users),
    countWebhookState(store, users),
    countNotificationRuleState(store, users),
    countTelegramState(store, users),
    countOutboundState(store, mailboxIds)
  ]);

  const diagnosticErrors = hasDiagnosticsIssue(diagnostics, "error");
  const diagnosticWarnings = hasDiagnosticsIssue(diagnostics, "warning");
  const hasConfiguredNotificationTarget = webhook.activeEndpoints > 0 || telegram.active > 0;
  const hasFailedDelivery = webhook.failedDeliveries > 0 || outbound.failed > 0;
  const hasStorageBinding = Boolean(c.env.ATTACHMENTS);
  const dataBindingStatus: SystemDiagnosticStatus =
    config.environment === "local" || c.env.DB ? (hasStorageBinding ? "ok" : "warning") : "error";

  const areas: ProductMaturityArea[] = [
    {
      id: "observability",
      title: "可观测性和运维后台",
      status: diagnostics.overallStatus,
      progress: clampProgress(55 + (webhook.deliveries > 0 ? 10 : 0) - diagnosticErrors * 10 - diagnosticWarnings * 4),
      summary: "系统诊断已经覆盖部署配置，投递记录可用于定位 Webhook 和 Telegram 相关问题。",
      signals: [
        makeSignal("诊断错误", diagnosticErrors, diagnosticErrors > 0 ? "error" : "ok"),
        makeSignal("诊断提醒", diagnosticWarnings, diagnosticWarnings > 0 ? "warning" : "ok"),
        makeSignal("Webhook 投递记录", webhook.deliveries)
      ],
      evidence: ["管理员系统诊断", "Webhook 投递列表和详情", "Telegram 投递列表"],
      nextActions: ["增加全局错误日志时间线", "增加关键链路告警和最近失败聚合", "记录定时清理任务运行历史"]
    },
    {
      id: "security",
      title: "用户安全与风控",
      status: "ok",
      progress: clampProgress(88 + (apiKeys.total > 0 ? 4 : 0) + (invites.total > 0 ? 4 : 0)),
      summary: "API Key scopes、设备会话吊销、登录历史、管理员审计概览、邀请码策略和限流策略可视化已有产品入口。",
      signals: [
        makeSignal("活跃用户", users.filter((user) => user.status === "active").length),
        makeSignal("API Key", `${formatCount(apiKeys.active)} 活跃 / ${formatCount(apiKeys.revoked)} 已吊销`),
        makeSignal("可用邀请码", invites.available)
      ],
      evidence: ["邀请码有效期、目标角色和批量生成", "个人设置会话设备列表", "API Key scopes", "治理概览登录历史", "管理员审计事件视图", "用户发信/API 调用配额"],
      nextActions: ["把限流策略从只读总览扩展为可编辑策略", "增加异常登录告警", "增加高风险操作二次确认策略"]
    },
    {
      id: "mail_workflow",
      title: "邮件产品体验",
      status: "ok",
      progress: clampProgress(86 + (messages.summary.attachmentCount > 0 ? 4 : 0) + (messages.summary.extractionCount > 0 ? 4 : 0)),
      summary: "邮件列表已支持高级筛选、批量删除/导出，详情页提供原文、附件元信息、保留倒计时和链接风险提示。",
      signals: [
        makeSignal("邮箱账号", mailboxPage.total),
        makeSignal("邮件总量", messages.total),
        makeSignal("识别结果", messages.summary.extractionCount),
        makeSignal("附件数量", messages.summary.attachmentCount)
      ],
      evidence: ["收件箱高级筛选", "邮件批量删除和 JSON 导出", "邮件详情原文", "附件预览元信息", "提取链接风险提示", "保留时间提示"],
      nextActions: ["增加归档和标记状态", "增加附件内联预览", "增加邮箱级保留策略覆盖"]
    },
    {
      id: "notifications",
      title: "通知与集成体系",
      status: hasConfiguredNotificationTarget ? (webhook.failedDeliveries > 0 ? "warning" : "ok") : "warning",
      progress: clampProgress(76 + (webhook.activeEndpoints > 0 ? 6 : 0) + (telegram.active > 0 ? 6 : 0) + (notificationRules.total > 0 ? 8 : 0) - webhook.failedDeliveries * 2),
      summary: "Webhook 和 Telegram 已有配置、投递日志、测试、重试和通知规则，规则可按目标、事件、邮箱、关键词和静默时间控制投递。",
      signals: [
        makeSignal("Webhook 端点", `${formatCount(webhook.activeEndpoints)} 启用 / ${formatCount(webhook.totalEndpoints)} 总计`),
        makeSignal("通知规则", `${formatCount(notificationRules.active)} 启用 / ${formatCount(notificationRules.total)} 总计`),
        makeSignal("失败投递", webhook.failedDeliveries, webhook.failedDeliveries > 0 ? "warning" : "ok"),
        makeSignal("Telegram 订阅", `${formatCount(telegram.active)} 启用 / ${formatCount(telegram.total)} 总计`)
      ],
      evidence: ["Webhook 签名投递", "Webhook 重试", "通知规则引擎", "Telegram Bot 菜单和 Webhook 配置", "Telegram 绑定码", "Slack/Discord/飞书/企业微信目标扩展点"],
      nextActions: ["增加规则命中统计", "增加失败投递自动重试队列", "接入 Slack/Discord/飞书/企业微信发送器"]
    },
    {
      id: "outbound",
      title: "发信能力完善",
      status: config.features.outboundEnabled && !config.integrations.resendApiKey ? "warning" : hasFailedDelivery ? "warning" : "ok",
      progress: clampProgress(78 + (config.integrations.resendApiKey ? 8 : 0) + (outbound.total > 0 ? 5 : 0) - outbound.failed * 2),
      summary: "出站邮件已有发送历史、失败原因、详情留存、发信成熟度检查、身份检查、DNS checklist、Return-Path 说明和模板入口。",
      signals: [
        makeSignal("发件开关", config.features.outboundEnabled ? "开启" : "关闭", config.features.outboundEnabled ? "ok" : "warning"),
        makeSignal("成功发信", outbound.sent),
        makeSignal("失败发信", outbound.failed, outbound.failed > 0 ? "warning" : "ok"),
        makeSignal("模板入口", "已提供", "ok")
      ],
      evidence: ["出站历史列表", "失败原因和 provider payload", "每日发件配额", "发信成熟度 API", "发信身份检查", "SPF/DKIM/DMARC checklist", "内置发信模板", "Return-Path 说明"],
      nextActions: ["接入 Resend 退信事件 webhook", "增加模板自定义管理", "增加 DNS 在线验证结果缓存"]
    },
    {
      id: "commercial",
      title: "商业化和权限模型",
      status: "ok",
      progress: clampProgress(82 + (users.length > 1 ? 5 : 0) + (apiKeys.total > 0 ? 3 : 0)),
      summary: "已有套餐层级、默认组织空间、成员角色、共享邮箱、个人/API/发信配额和组织审计摘要。",
      signals: [
        makeSignal("用户数", users.length),
        makeSignal("管理员", users.filter((user) => user.role === "admin").length),
        makeSignal("系统邮箱上限", config.mailbox.limit),
        makeSignal("组织空间", "已启用", "ok")
      ],
      evidence: ["免费/高级/团队套餐定义", "默认组织空间", "成员角色", "共享邮箱统计", "用户配额", "组织级用量", "组织审计摘要"],
      nextActions: ["接入真实计费供应商", "增加多组织切换", "增加团队成员邀请审批"]
    },
    {
      id: "documentation",
      title: "文档和自助排障",
      status: "warning",
      progress: 65,
      summary: "部署、OAuth、Cloudflare、Email Routing 和运营文档已进入文档站，自助排障还要继续场景化。",
      signals: [
        makeSignal("部署文档", "已覆盖", "ok"),
        makeSignal("OAuth 文档", "已覆盖", "ok"),
        makeSignal("运营检查清单", "待增强", "warning")
      ],
      evidence: ["文档站部署说明", "OAuth 快捷登录文档", "运维 runbook", "产品成熟度 PLAN"],
      nextActions: ["增加 Telegram/Resend/Email Routing 场景化排障", "在页面内联诊断动作", "补充故障处理 SOP"]
    },
    {
      id: "data_reliability",
      title: "数据可靠性",
      status: expiredMessages.length > 0 || cleanupRuns.some((run) => run.status === "failed") ? "warning" : dataBindingStatus,
      progress: clampProgress(82 + (c.env.DB || config.environment === "local" ? 5 : 0) + (hasStorageBinding ? 5 : 0) + (cleanupRuns.length > 0 ? 4 : 0) - expiredMessages.length),
      summary: "D1 migration、备份/恢复 runbook、R2 附件清理、幂等入库、重复通知抑制和清理运行记录已有后台入口。",
      signals: [
        makeSignal("D1 绑定", c.env.DB || config.environment === "local" ? "可用" : "缺失", c.env.DB || config.environment === "local" ? "ok" : "error"),
        makeSignal("R2 附件绑定", hasStorageBinding ? "可用" : "未绑定", hasStorageBinding ? "ok" : "warning"),
        makeSignal("已过期邮件", expiredMessages.length, expiredMessages.length > 0 ? "warning" : "ok"),
        makeSignal("清理记录", cleanupRuns.length, cleanupRuns.length > 0 ? "ok" : "warning")
      ],
      evidence: ["D1 migration 管理", "备份/恢复 runbook", "清理任务运行记录", "R2 附件清理", "5 分钟幂等入库窗口", "重复通知抑制"],
      nextActions: ["增加备份自动化", "增加清理失败告警", "增加长期冷存储策略"]
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: resolveOverallStatus(areas),
    completedAreas: areas.filter((area) => area.status === "ok").length,
    totalAreas: areas.length,
    areas
  };
}

export function registerSystemRoutes(app: Hono<AppContext>) {
  app.get("/api/system/health", (c) => {
    const config = resolveAppConfig(c.env);
    return c.json({
      ok: true,
      environment: config.environment,
      appName: config.appName,
      featureToggles: c.get("featureToggles") ?? defaultFeatureToggles(c.env)
    });
  });

  app.get("/api/system/diagnostics", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    return c.json({ diagnostics: await buildSystemDiagnostics(c) });
  });

  app.get("/api/system/maturity", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    return c.json({ maturity: await buildProductMaturity(c) });
  });

  app.get("/api/system/reliability", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    return c.json({ reliability: await buildDataReliability(c) });
  });

  app.get("/api/system/features", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    return c.json({ featureToggles: c.get("featureToggles") });
  });

  app.patch("/api/system/features", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    const next = await updateFeatureTogglesUseCase(
      {
        ...getAppServices(c),
        currentFeatureToggles: c.get("featureToggles")
      },
      (await c.req.json()) as Partial<FeatureToggles>,
      user.id
    );
    return c.json({ featureToggles: next });
  });

  app.get("/api/system/domains", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const payload = await cachedJson(c.env.CACHE, CACHE_KEYS.mailDomains, CACHE_TTL_SECONDS.systemDomains, () =>
      getMailDomainSettingsUseCase(getAppServices(c), c.env)
    );
    return c.json(payload);
  });

  app.patch("/api/system/domains", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    const result = await updateMailDomainsUseCase(getAppServices(c), await c.req.json(), user.id);
    if (result instanceof Response) return result;
    await deleteCacheKeys(c.env.CACHE, [CACHE_KEYS.mailDomains]);
    return c.json(result);
  });

  app.get("/api/system/runtime-settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const settings = await cachedJson(c.env.CACHE, CACHE_KEYS.runtimeSettings, CACHE_TTL_SECONDS.settings, () =>
      getRuntimeSettings(c.get("store"), c.env)
    );
    return c.json({ settings });
  });

  app.patch("/api/system/runtime-settings", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);

    let payload: RuntimeSettingsUpdateInput;
    try {
      payload = (await c.req.json()) as RuntimeSettingsUpdateInput;
    } catch {
      return jsonError("Invalid request", 400);
    }

    try {
      const settings = await updateRuntimeSettings(c.get("store"), c.env, payload);
      await deleteCacheKeys(c.env.CACHE, [CACHE_KEYS.runtimeSettings]);
      return c.json({ settings });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }
  });
}
