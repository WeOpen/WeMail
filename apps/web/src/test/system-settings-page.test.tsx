import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeSettings } from "@wemail/shared";

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

function renderSystemSettingsPage(props: Partial<ComponentProps<typeof SystemSettingsPage>> = {}) {
  return render(
    <SystemSettingsPage
      runtimeSettings={null}
      resolvedTheme="light"
      themePreference="system"
      onSaveRuntimeSettings={vi.fn()}
      onSelectThemePreference={vi.fn()}
      {...props}
    />
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
    expect(screen.getByLabelText("系统设置状态侧栏")).toHaveClass("system-settings-side-rail");
    expect(screen.getByRole("heading", { name: "系统控制台" })).toBeInTheDocument();
    expect(screen.getByText("主题模式")).toBeInTheDocument();
    expect(screen.queryByText("选择你想要的界面明暗")).not.toBeInTheDocument();
    expect(screen.queryByText(/像 Apple 偏好设置/)).not.toBeInTheDocument();
    expect(screen.queryByText(/入口已预留/)).not.toBeInTheDocument();
  });

  it("summarizes theme state and domain management permission from real props", () => {
    renderSystemSettingsPage({ canManageDomains: true, resolvedTheme: "dark", runtimeSettings });

    expect(screen.getByLabelText("当前主题模式")).toHaveTextContent("跟随系统");
    expect(screen.getByLabelText("当前解析主题")).toHaveTextContent("深色");
    expect(screen.getByLabelText("域名管理权限")).toHaveTextContent("可管理");
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

  it("centers theme option captions and avoids a divider line in the system preview", () => {
    expect(sharedStyles).toMatch(/\.appearance-option-copy\s*\{[^}]*text-align:\s*center;/);
    expect(sharedStyles).toMatch(/\.appearance-option-copy\s*\{[^}]*justify-items:\s*center;/);
    expect(sharedStyles).toMatch(/\.appearance-option-title\s*\{[^}]*justify-content:\s*center;/);
    expect(sharedStyles).toMatch(/\.appearance-option-preview\.system\s*\{[^}]*linear-gradient\(180deg,/);
    expect(sharedStyles).toMatch(
      /\.appearance-option-preview\.system \.appearance-option-preview-sidebar\s*\{[^}]*background:\s*transparent;/
    );
  });

  it("keeps runtime save text legible on the contrast button", () => {
    renderSystemSettingsPage({ canManageDomains: true, runtimeSettings });

    const saveRuntimeButton = screen.getByRole("button", { name: "保存运行策略" });

    expect(saveRuntimeButton).toHaveClass("system-runtime-save-button");
    expect(sharedStyles).toMatch(/\.system-runtime-save-button\.ui-button-primary\s*\{[^}]*color:\s*#fff;/);
  });

  it("lets admins save mailbox domain suffixes without a separate add button", async () => {
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
    expect(screen.getByText(/所有角色可用/)).toBeInTheDocument();

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
