import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("system settings route integration", () => {
  let sessionRole: "admin" | "member";

  beforeEach(() => {
    sessionRole = "member";
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/system/settings");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            role: sessionRole,
            createdAt: "2026-04-08T00:00:00.000Z"
          },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
      if (url.endsWith("/api/telegram/overview")) return jsonResponse({ overview: null });
      if (url.endsWith("/api/telegram/deliveries")) return jsonResponse({ deliveries: [] });
      if (url.endsWith("/api/dictionaries")) return jsonResponse({ dictionaries: [] });
      if (url.endsWith("/api/users")) return jsonResponse({ users: [] });
      if (url.includes("/api/users/invites")) return jsonResponse({ invites: [] });
      if (url.endsWith("/api/system/features")) {
        return jsonResponse({
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }
      if (url.endsWith("/api/system/domains")) {
        return jsonResponse({
          domains: [{ domain: "example.com", allowedRoles: [] }],
          primaryDomain: "example.com"
        });
      }
      if (/\/api\/users\/[^/]+\/quota/.test(url)) {
        return jsonResponse({
          quota: {
            userId: "member-1",
            dailyLimit: 20,
            sendsToday: 0,
            disabled: false,
            updatedAt: "2026-04-08T00:00:00.000Z"
          }
        });
      }
      if (url.includes("/api/users/accounts")) return jsonResponse({ mailboxes: [] });
      if (url.endsWith("/api/system/runtime-settings")) {
        return jsonResponse({
          settings: {
            mailbox: { limit: 5 },
            message: { retentionDays: 7 },
            outbound: { dailyLimit: 20 },
            api: { dailyLimit: 20000 },
            attachments: { maxBytes: 10485760, maxTotalBytes: 15728640 },
            ai: { fallbackLimit: 20 },
            lastUpdatedLabel: "2026-04-08T00:00:00.000Z"
          }
        });
      }
      if (url.endsWith("/api/system/diagnostics")) {
        return jsonResponse({
          diagnostics: {
            appName: "WeMail",
            environment: "production",
            generatedAt: "2026-06-28T00:00:00.000Z",
            overallStatus: "warning",
            checks: [
              {
                id: "outbound.resend",
                label: "Resend 发信",
                status: "warning",
                message: "发件功能已开启但 RESEND_API_KEY 未配置",
                action: "配置 RESEND_API_KEY，或在功能开关里关闭发件能力。"
              }
            ]
          }
        });
      }
      if (url.endsWith("/api/system/maturity")) {
        return jsonResponse({
          maturity: {
            generatedAt: "2026-06-28T00:00:00.000Z",
            overallStatus: "warning",
            completedAreas: 2,
            totalAreas: 8,
            areas: [
              {
                id: "observability",
                title: "可观测性和运维后台",
                status: "warning",
                progress: 68,
                summary: "系统诊断已经覆盖部署配置。",
                signals: [],
                evidence: [],
                nextActions: []
              },
              {
                id: "notifications",
                title: "通知与集成体系",
                status: "ok",
                progress: 82,
                summary: "Webhook 和 Telegram 已有配置、投递日志、测试和重试入口。",
                signals: [],
                evidence: [],
                nextActions: []
              }
            ]
          }
        });
      }
      if (url.endsWith("/api/system/operations")) {
        return jsonResponse({
          operations: {
            generatedAt: "2026-06-28T00:00:00.000Z",
            overallStatus: "error",
            signals: [
              { label: "最近失败", value: "1", status: "error" },
              { label: "D1/R2 绑定", value: "完整", status: "ok" }
            ],
            recentEvents: [
              {
                id: "webhook:delivery-1",
                source: "webhook",
                severity: "error",
                label: "Webhook message.received",
                message: "状态码 500",
                occurredAt: "2026-06-28T08:30:00.000Z",
                actionLabel: "查看并重试",
                actionHref: "/webhook"
              }
            ]
          }
        });
      }
      if (url.endsWith("/api/system/reliability")) {
        return jsonResponse({
          reliability: {
            generatedAt: "2026-06-28T00:00:00.000Z",
            status: "warning",
            storage: {
              d1: "ok",
              r2: "warning",
              message: "D1 可用，R2 附件绑定未检测到"
            },
            migrations: [
              {
                id: "0017",
                title: "清理任务运行记录",
                status: "ok",
                description: "记录定时清理任务成功/失败和删除数量。"
              }
            ],
            cleanup: {
              expiredMessages: 0,
              recentRuns: [
                {
                  id: "cleanup-1",
                  status: "success",
                  startedAt: "2026-06-28T08:00:00.000Z",
                  finishedAt: "2026-06-28T08:00:02.000Z",
                  deletedMessages: 2,
                  deletedAttachments: 1,
                  deletedAccounts: 0,
                  errorText: null
                }
              ]
            },
            idempotency: {
              enabled: true,
              duplicateWindowMinutes: 5,
              duplicateNotificationPrevention: true,
              message: "同一邮箱 5 分钟内的重复入站会复用已有记录。"
            },
            backupRunbook: [
              {
                title: "导出 D1 备份",
                command: "pnpm exec wrangler d1 export <database> --remote --output backup.sql",
                cadence: "每日"
              }
            ]
          }
        });
      }

      return jsonResponse({});
    });
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the redesigned system settings page on /system/settings", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^系统控制台$/i })).toBeInTheDocument();
    expect(screen.getByLabelText("系统设置概览")).toBeInTheDocument();
    expect(screen.getByLabelText("系统设置主设置")).toBeInTheDocument();
    expect(screen.queryByLabelText("系统设置状态侧栏")).not.toBeInTheDocument();
    expect(screen.queryByText("当前外观")).not.toBeInTheDocument();
    expect(screen.queryByText("域名权限")).not.toBeInTheDocument();
    expect(screen.getByText("主题模式")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "域名设置" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^业务默认值$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^外观设置$/i })).not.toBeInTheDocument();
  });

  it("shows runtime settings controls to administrators", async () => {
    sessionRole = "admin";

    render(<App />);

    expect(await screen.findByRole("heading", { name: /^系统控制台$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^能力开关$/i })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: /AI 提取/i })).toBeChecked();
    expect(await screen.findByRole("heading", { name: /^业务默认值$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^运维中心$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^系统诊断$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^成熟度总览$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^可靠性后台$/i })).not.toBeInTheDocument();
    expect(await screen.findAllByText("20 / 天")).toHaveLength(2);
    expect(screen.getByLabelText("运行策略概览")).toBeInTheDocument();
  });

  it("renders operations cards on /system/operations", async () => {
    sessionRole = "admin";
    window.history.pushState({}, "", "/system/operations");

    render(<App />);

    expect(await screen.findByRole("heading", { name: /^运维中心$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^系统诊断$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^成熟度总览$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^可靠性后台$/i })).toBeInTheDocument();
    expect(screen.getByLabelText("运维中心卡片")).toBeInTheDocument();
    expect(screen.getByText("Webhook message.received")).toBeInTheDocument();
    expect(screen.getByText("发件功能已开启但 RESEND_API_KEY 未配置")).toBeInTheDocument();
    expect(screen.getByText("同一邮箱 5 分钟内的重复入站会复用已有记录。")).toBeInTheDocument();
    expect(screen.getByText("可观测性和运维后台")).toBeInTheDocument();
    expect(screen.getByText("2 / 8")).toBeInTheDocument();
  });
});
