import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureToggles, RuntimeSettings } from "@wemail/shared";

import { SystemSettingsPage } from "../pages/SystemSettingsPage";

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
