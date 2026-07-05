import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DataReliabilitySummary,
  FeatureToggles,
  ProductMaturitySummary,
  RuntimeSettings,
  SystemDiagnosticsSummary,
  SystemOperationsSummary
} from "@wemail/shared";

import { SystemSettingsPage } from "../pages/SystemSettingsPage";
import { SystemOperationsPage } from "../pages/SystemOperationsPage";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");
const runtimeSettings: RuntimeSettings = {
  ai: { fallbackLimit: 20 },
  api: { dailyLimit: 20000 },
  attachments: { maxBytes: 10485760, maxTotalBytes: 15728640 },
  mailbox: { limit: 5 },
  message: { retentionDays: 7 },
  outbound: { dailyLimit: 20 },
  lastUpdatedLabel: "2026-04-08T00:00:00.000Z"
};

const adminFeatures: FeatureToggles = {
  aiEnabled: true,
  telegramEnabled: true,
  outboundEnabled: true,
  mailboxCreationEnabled: true
};

const systemDiagnostics: SystemDiagnosticsSummary = {
  appName: "WeMail",
  environment: "production",
  generatedAt: "2026-06-28T00:00:00.000Z",
  overallStatus: "error",
  checks: [
    {
      id: "cookie.secure",
      label: "Cookie Secure",
      status: "error",
      message: "Cookie Secure 未开启",
      action: "生产和预发布环境应设置 COOKIE_SECURE=true。"
    },
    {
      id: "cors.origins",
      label: "CORS 来源",
      status: "error",
      message: "CORS 来源未配置",
      action: "配置 CORS_ALLOWED_ORIGINS 为前端站点域名。"
    }
  ]
};

const systemMaturity: ProductMaturitySummary = {
  generatedAt: "2026-06-28T00:00:00.000Z",
  overallStatus: "warning",
  completedAreas: 1,
  totalAreas: 8,
  areas: [
    {
      id: "observability",
      title: "可观测性和运维后台",
      status: "warning",
      progress: 64,
      summary: "系统诊断已经覆盖部署配置。",
      signals: [{ label: "诊断提醒", value: "2", status: "warning" }],
      evidence: ["管理员系统诊断"],
      nextActions: ["增加全局错误日志时间线"]
    },
    {
      id: "security",
      title: "用户安全与风控",
      status: "warning",
      progress: 55,
      summary: "邀请码、会话、API Key 和配额已有基础能力。",
      signals: [{ label: "API Key", value: "1 活跃 / 0 已吊销" }],
      evidence: ["API Key 创建和吊销"],
      nextActions: ["增加 API Key scope"]
    }
  ]
};

const systemOperations: SystemOperationsSummary = {
  generatedAt: "2026-06-28T00:00:00.000Z",
  overallStatus: "error",
  signals: [
    { label: "最近失败", value: "3", status: "error" },
    { label: "Webhook 失败", value: "2", status: "error" },
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
    },
    {
      id: "telegram:audit-1",
      source: "telegram",
      severity: "error",
      label: "Telegram 投递",
      message: "chat not found",
      occurredAt: "2026-06-28T08:20:00.000Z",
      actionLabel: "查看 Telegram 设置",
      actionHref: "/settings/telegram"
    }
  ]
};

const systemReliability: DataReliabilitySummary = {
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
    message: "同一邮箱 5 分钟内的同发件人、主题、收件人和正文预览会复用已有记录，并抑制重复通知。"
  },
  backupRunbook: [
    {
      title: "导出 D1 备份",
      command: "pnpm exec wrangler d1 export <database> --remote --output backup.sql",
      cadence: "每日"
    },
    {
      title: "恢复 D1 备份",
      command: "pnpm exec wrangler d1 execute <database> --remote --file backup.sql",
      cadence: "故障恢复时"
    }
  ]
};

function renderSystemSettingsPage(props: Partial<ComponentProps<typeof SystemSettingsPage>> = {}) {
  return render(
    <MemoryRouter>
      <SystemSettingsPage
        runtimeSettings={null}
        resolvedTheme="light"
        themePreference="system"
        onSaveRuntimeSettings={vi.fn()}
        onSelectThemePreference={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}

function renderSystemOperationsPage(props: Partial<ComponentProps<typeof SystemOperationsPage>> = {}) {
  return render(
    <MemoryRouter>
      <SystemOperationsPage {...props} />
    </MemoryRouter>
  );
}

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a redesigned overview, main settings column, and status rail", () => {
    renderSystemSettingsPage();

    expect(screen.getByLabelText("系统设置概览")).toHaveClass("system-settings-overview-panel");
    expect(screen.getByLabelText("系统设置主设置")).toHaveClass("system-settings-main-column");
    expect(screen.queryByLabelText("系统设置状态侧栏")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "系统控制台" })).toBeInTheDocument();
    expect(screen.getByText("主题模式")).toBeInTheDocument();
    expect(screen.queryByText("当前外观")).not.toBeInTheDocument();
    expect(screen.queryByText("域名权限")).not.toBeInTheDocument();
    expect(sharedStyles).toMatch(/\.system-settings-content-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(screen.queryByRole("heading", { name: "运维中心" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "系统诊断" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "可靠性后台" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "成熟度总览" })).not.toBeInTheDocument();
    expect(screen.queryByText("选择你想要的界面明暗")).not.toBeInTheDocument();
    expect(screen.queryByText(/像 Apple 偏好设置/)).not.toBeInTheDocument();
    expect(screen.queryByText(/入口已预留/)).not.toBeInTheDocument();
  });

  it("summarizes theme state and domain management permission from real props", () => {
    renderSystemSettingsPage({ canManageDomains: true, resolvedTheme: "dark", runtimeSettings });

    expect(screen.getByLabelText("当前主题模式")).toHaveTextContent("跟随系统");
    expect(screen.getByLabelText("当前解析主题")).toHaveTextContent("深色");
    expect(screen.getByLabelText("域名管理权限")).toHaveTextContent("成员可管理");
    expect(screen.getByText("管理员")).toBeInTheDocument();
  });

  it("offers light, dark, and system theme preferences", () => {
    const onSelectThemePreference = vi.fn();

    renderSystemSettingsPage({ resolvedTheme: "dark", onSelectThemePreference });

    fireEvent.click(screen.getByRole("button", { name: "浅色模式" }));
    fireEvent.click(screen.getByRole("button", { name: "深色模式" }));
    fireEvent.click(screen.getByRole("button", { name: "跟随系统" }));

    expect(onSelectThemePreference).toHaveBeenNthCalledWith(1, "light");
    expect(onSelectThemePreference).toHaveBeenNthCalledWith(2, "dark");
    expect(onSelectThemePreference).toHaveBeenNthCalledWith(3, "system");
  });

  it("keeps theme options as the primary appearance controls", () => {
    renderSystemSettingsPage({ resolvedTheme: "dark" });

    expect(screen.getByRole("button", { name: "浅色模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "深色模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "跟随系统" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "跟随系统" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows admin system diagnostics in the status rail", () => {
    renderSystemOperationsPage({ systemDiagnostics });

    expect(screen.getByRole("heading", { name: "系统诊断" })).toBeInTheDocument();
    expect(screen.getByText("需要处理")).toBeInTheDocument();
    expect(screen.getByText("Cookie Secure 未开启")).toBeInTheDocument();
    expect(screen.getByText("CORS 来源未配置")).toBeInTheDocument();
  });

  it("shows the product maturity overview for administrators", () => {
    renderSystemOperationsPage({ systemMaturity });

    expect(screen.getByRole("heading", { name: "成熟度总览" })).toBeInTheDocument();
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    expect(screen.getByText("可观测性和运维后台")).toBeInTheDocument();
    expect(screen.getByText("64% · 有提醒")).toBeInTheDocument();
    expect(screen.getByText("用户安全与风控")).toBeInTheDocument();
  });

  it("shows recent operation failures for administrators", () => {
    renderSystemOperationsPage({ systemOperations });

    expect(screen.getByRole("heading", { name: "错误中心" })).toBeInTheDocument();
    expect(screen.getByLabelText("运维信号")).toHaveTextContent("最近失败");
    expect(screen.getByLabelText("运维信号")).toHaveTextContent("3");
    expect(screen.getByLabelText("最近运维事件")).toHaveTextContent("Webhook message.received");
    expect(screen.getByLabelText("最近运维事件")).toHaveTextContent("状态码 500");
    expect(screen.getByRole("link", { name: "查看并重试" })).toHaveAttribute("href", "/webhook");
  });

  it("shows data reliability checks, cleanup runs, idempotency, and backup commands", () => {
    renderSystemOperationsPage({ systemReliability });

    expect(screen.getByRole("heading", { name: "可靠性后台" })).toBeInTheDocument();
    expect(screen.getByLabelText("存储绑定")).toHaveTextContent("D1");
    expect(screen.getByText("同一邮箱 5 分钟内的同发件人、主题、收件人和正文预览会复用已有记录，并抑制重复通知。")).toBeInTheDocument();
    expect(screen.getByText("1 个迁移已纳入可靠性检查。")).toBeInTheDocument();
    expect(screen.getByLabelText("最近清理任务")).toHaveTextContent("2 封邮件 / 1 个附件");
    expect(screen.getByLabelText("备份恢复命令")).toHaveTextContent("wrangler d1 export");
  });

  it("uses horizontal theme option cards and avoids a divider line in the system preview", () => {
    expect(sharedStyles).toMatch(/\.appearance-option-card\s*\{[^}]*grid-template-columns:\s*minmax\(118px,\s*0\.42fr\)\s*minmax\(0,\s*1fr\);/);
    expect(sharedStyles).toMatch(/\.appearance-option-preview\s*\{[^}]*grid-template-columns:\s*minmax\(30px,\s*0\.34fr\)\s*minmax\(0,\s*1fr\);/);
    expect(sharedStyles).toMatch(/\.appearance-option-preview-topbar\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/);
    expect(sharedStyles).toMatch(/\.appearance-option-copy\s*\{[^}]*text-align:\s*left;/);
    expect(sharedStyles).toMatch(/\.appearance-option-copy\s*\{[^}]*justify-items:\s*start;/);
    expect(sharedStyles).toMatch(/\.appearance-option-title\s*\{[^}]*justify-content:\s*flex-start;/);
    expect(sharedStyles).toMatch(/\.appearance-option-preview\.system\s*\{[^}]*linear-gradient\(180deg,/);
    expect(sharedStyles).toMatch(
      /\.appearance-option-preview\.system \.appearance-option-preview-sidebar\s*\{[^}]*background:\s*transparent;/
    );
  });

  it("keeps runtime save text legible on the contrast button", () => {
    renderSystemSettingsPage({ canManageDomains: true, canManageRuntimeSettings: true, runtimeSettings });

    const saveRuntimeButton = screen.getByRole("button", { name: "保存运行策略" });

    expect(saveRuntimeButton).toHaveClass("system-runtime-save-button");
    expect(sharedStyles).toMatch(/\.system-runtime-save-button\.ui-button-primary\s*\{[^}]*color:\s*#fff;/);
    expect(screen.getByLabelText("邮箱每日邮件发送上限")).toBeInTheDocument();
    expect(screen.getByLabelText("每日 API 调用上限")).toBeInTheDocument();
  });

  it("shows runtime feature toggles in system settings for administrators", () => {
    const onToggleFeatures = vi.fn();

    renderSystemSettingsPage({
      adminFeatures,
      canManageRuntimeSettings: true,
      onToggleFeatures,
      runtimeSettings
    });

    expect(screen.getByRole("heading", { name: "能力开关" })).toBeInTheDocument();
    expect(screen.getByText("4 / 4 启用")).toHaveClass("users-feature-status-badge");
    expect(sharedStyles).toMatch(/\.users-feature-status-badge\s*\{[^}]*padding:\s*10px 18px;/);

    fireEvent.click(screen.getByRole("checkbox", { name: "AI 提取" }));

    expect(onToggleFeatures).toHaveBeenCalledWith({
      ...adminFeatures,
      aiEnabled: false
    });
  });

  it("lets session users save mailbox domain suffixes without a separate add button", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/system/domains") && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              domains: [
                { domain: "example.com", allowedRoles: [] },
                { domain: "mail.example.org", allowedRoles: ["member"] }
              ],
              primaryDomain: "example.com"
            }),
            { headers: { "content-type": "application/json" } }
          )
        );
      }

      if (url.endsWith("/api/system/domains")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              domains: [{ domain: "example.com", allowedRoles: [] }],
              primaryDomain: "example.com"
            }),
            { headers: { "content-type": "application/json" } }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({}), { headers: { "content-type": "application/json" } }));
    });

    renderSystemSettingsPage({ canManageDomains: true, resolvedTheme: "dark", runtimeSettings });

    expect(await screen.findByRole("heading", { name: "域名设置" })).toBeInTheDocument();
    expect(screen.getByLabelText("当前默认域名")).toHaveTextContent("@example.com");
    expect(screen.getByRole("button", { name: "移除 example.com" })).toBeInTheDocument();
    expect(screen.getAllByText(/所有用户可用/).length).toBeGreaterThan(0);

    fireEvent.focus(screen.getByRole("button", { name: "域名可用范围说明" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("不勾选角色时，域名默认对所有用户可用。");

    const domainInput = screen.getByLabelText("新增域名后缀");
    const saveDomainButton = screen.getByRole("button", { name: "保存域名设置" });

    fireEvent.change(domainInput, { target: { value: "bad-.example.com" } });
    expect(screen.queryByRole("button", { name: "添加域名" })).not.toBeInTheDocument();
    expect(saveDomainButton.querySelector("svg")).not.toBeNull();
    fireEvent.click(saveDomainButton);
    expect(screen.getByRole("alert")).toHaveTextContent("请输入有效的域名后缀");

    fireEvent.change(domainInput, { target: { value: "Mail.EXAMPLE.org" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "成员" }));
    fireEvent.click(saveDomainButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/system\/domains$/),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            domains: [
              { domain: "example.com", allowedRoles: [] },
              { domain: "mail.example.org", allowedRoles: ["member"] }
            ]
          })
        })
      );
    });
    expect(await screen.findByText("域名设置已保存。")).toBeInTheDocument();
  });
});
