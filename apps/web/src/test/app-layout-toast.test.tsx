import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionSummary } from "@wemail/shared";

import { AppLayout } from "../app/AppLayout";
import type { WorkspaceShellState } from "../app/workspaceShell";

const session: SessionSummary = {
  user: {
    id: "member-1",
    email: "member@example.com",
    name: "Member User",
    role: "member",
    status: "active",
    createdAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z"
  },
  featureToggles: {
    aiEnabled: true,
    telegramEnabled: true,
    outboundEnabled: true,
    mailboxCreationEnabled: true
  }
};

const shell: WorkspaceShellState = {
  routeKey: "dashboard",
  routeLabel: "仪表盘",
  activePrimaryId: "dashboard",
  activePrimaryLabel: "仪表盘",
  secondaryNav: [],
  railSections: [
    {
      title: "工作台",
      items: [{ id: "dashboard", icon: "dashboard", label: "仪表盘", to: "/dashboard" }]
    }
  ]
};

const adminShell: WorkspaceShellState = {
  routeKey: "dashboard",
  routeLabel: "仪表盘",
  activePrimaryId: "dashboard",
  activePrimaryLabel: "仪表盘",
  secondaryNav: [],
  railSections: [
    {
      title: "工作台",
      items: [
        { id: "dashboard", icon: "dashboard", label: "仪表盘", to: "/dashboard" },
        { id: "accounts", icon: "accounts", label: "账号", to: "/accounts/list" },
        { id: "mail", icon: "mail", label: "邮件", to: "/mail/list" },
        { id: "users", icon: "users", label: "用户", to: "/users/list" }
      ]
    },
    {
      title: "设置",
      items: [
        { id: "api-keys", icon: "keys", label: "API 密钥", to: "/api-keys" },
        { id: "webhook", icon: "webhook", label: "Webhook", to: "/webhook" },
        { id: "telegram", icon: "telegram", label: "Telegram", to: "/telegram" },
        { id: "announcements", icon: "announcements", label: "公告", to: "/announcements" },
        { id: "system", icon: "system", label: "系统设置", to: "/system/settings" }
      ]
    }
  ]
};

describe("AppLayout notice removal", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render the old workspace notice banner anymore", () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout
          session={session}
          onLogout={vi.fn()}
          onToggleTheme={vi.fn()}
          shell={shell}
          theme="light"
        >
          <div>dashboard body</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("dashboard body")).toBeInTheDocument();
    expect(container.querySelector(".workspace-notice-banner")).toBeNull();
  });

  it("uses an icon-only account trigger with profile actions in the user menu", () => {
    const handleLogout = vi.fn();

    render(
      <MemoryRouter>
        <AppLayout
          session={session}
          onLogout={handleLogout}
          onToggleTheme={vi.fn()}
          shell={shell}
          theme="light"
        >
          <div>dashboard body</div>
        </AppLayout>
      </MemoryRouter>
    );

    const userMenuTrigger = screen.getByRole("button", { name: "用户菜单" });

    expect(userMenuTrigger).toHaveClass("ui-button-icon-only");
    expect(userMenuTrigger).not.toHaveTextContent(session.user.email);

    fireEvent.click(userMenuTrigger);

    const userMenu = screen.getByRole("menu");
    expect(within(userMenu).queryByText(/用户名：/)).not.toBeInTheDocument();
    expect(within(userMenu).queryByText(session.user.email)).not.toBeInTheDocument();
    expect(within(userMenu).getByRole("menuitem", { name: "个人设置" })).toHaveAttribute("href", "/system/profile");

    fireEvent.click(within(userMenu).getByRole("menuitem", { name: "退出登录" }));

    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it("renders a mobile dock with workspace icons and a separate settings icon bar", () => {
    render(
      <MemoryRouter>
        <AppLayout
          session={session}
          onLogout={vi.fn()}
          onToggleTheme={vi.fn()}
          shell={adminShell}
          theme="light"
        >
          <div>dashboard body</div>
        </AppLayout>
      </MemoryRouter>
    );

    const mobileDock = screen.getByRole("navigation", { name: "移动端工作台 Dock" });

    expect(within(mobileDock).getAllByRole("link")).toHaveLength(4);
    expect(within(mobileDock).getByRole("link", { name: "仪表盘" })).toHaveAttribute("href", "/dashboard");
    expect(within(mobileDock).getByRole("link", { name: "账号" })).toHaveAttribute("href", "/accounts/list");
    expect(within(mobileDock).getByRole("link", { name: "邮件" })).toHaveAttribute("href", "/mail/list");
    expect(within(mobileDock).getByRole("link", { name: "用户" })).toHaveAttribute("href", "/users/list");

    fireEvent.click(within(mobileDock).getByRole("button", { name: "设置菜单" }));

    const settingsMenu = screen.getByRole("menu", { name: "移动端设置菜单" });
    expect(within(settingsMenu).getAllByRole("menuitem")).toHaveLength(5);
    expect(within(settingsMenu).getByRole("menuitem", { name: "API 密钥" })).toHaveAttribute("href", "/api-keys");
    expect(within(settingsMenu).getByRole("menuitem", { name: "Webhook" })).toHaveAttribute("href", "/webhook");
    expect(within(settingsMenu).getByRole("menuitem", { name: "Telegram" })).toHaveAttribute("href", "/telegram");
    expect(within(settingsMenu).getByRole("menuitem", { name: "公告" })).toHaveAttribute("href", "/announcements");
    expect(within(settingsMenu).getByRole("menuitem", { name: "系统设置" })).toHaveAttribute("href", "/system/settings");
  });
});
