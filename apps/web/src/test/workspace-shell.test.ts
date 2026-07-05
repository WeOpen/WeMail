import { describe, expect, it } from "vitest";

import { buildWorkspaceShellState } from "../app/workspaceShell";

describe("buildWorkspaceShellState", () => {
  it("builds grouped primary navigation and mail secondary navigation for mail routes", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/mail/list",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          name: "Member User",
          role: "member",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.activePrimaryId).toBe("mail");
    expect(shell.routeLabel).toBe("邮件列表");
    expect(shell.secondaryNav.map((item) => item.label)).toEqual(["邮件列表", "发件箱", "邮件设置"]);

    expect(shell.railSections).toEqual([
      {
        title: "工作台",
        items: [
          { id: "dashboard", icon: "dashboard", label: "仪表盘", to: "/dashboard", hint: undefined },
          {
            id: "accounts",
            icon: "accounts",
            label: "账号",
            to: "/accounts/list",
            hint: "账号列表 · 账号设置"
          },
          {
            id: "mail",
            icon: "mail",
            label: "邮件",
            to: "/mail/list",
            hint: "邮件列表 · 发件箱 · 邮件设置"
          }
        ]
      },
      {
        title: "设置",
        items: [
          { id: "api-keys", icon: "keys", label: "API 密钥", to: "/api-keys", hint: "API 密钥 · API 接口" },
          { id: "webhook", icon: "webhook", label: "Webhook", to: "/webhook", hint: undefined },
          { id: "telegram", icon: "telegram", label: "Telegram", to: "/telegram", hint: undefined },
          { id: "announcements", icon: "announcements", label: "公告", to: "/announcements", hint: undefined },
          {
            id: "system",
            icon: "system",
            label: "系统设置",
            to: "/system/settings",
            hint: "系统设置 · 运维中心 · 个人设置 · 关于我们"
          }
        ]
      }
    ]);
  });

  it("keeps the admin-only user menu hidden for members", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/dashboard",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          name: "Member User",
          role: "member",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.railSections[0]?.items.some((item) => item.label === "用户")).toBe(false);
  });

  it("places the admin user menu directly below the dashboard", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/dashboard",
      session: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "admin",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.railSections[0]?.items.map((item) => item.label)).toEqual(["仪表盘", "用户", "账号", "邮件"]);
  });

  it("normalizes /mail/unassigned to the outbound shell so legacy deep links stay in the mail workspace", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/mail/unassigned",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          name: "Member User",
          role: "member",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.activePrimaryId).toBe("mail");
    expect(shell.routeLabel).toBe("发件箱");
    expect(shell.secondaryNav.map((item) => item.to)).toEqual(["/mail/list", "/mail/outbound", "/mail/settings"]);
  });

  it("normalizes /settings to the api key route and preserves the settings rail", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/settings",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          name: "Member User",
          role: "member",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.routeKey).toBe("api-keys");
    expect(shell.routeLabel).toBe("API 密钥");
    expect(shell.secondaryNav.map((item) => item.label)).toEqual(["API 密钥", "API 接口"]);
  });

  it("treats the API interface catalog as an API key secondary route", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/api-keys/interfaces",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          name: "Member User",
          role: "member",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.activePrimaryId).toBe("api-keys");
    expect(shell.routeLabel).toBe("API 接口");
    expect(shell.secondaryNav.map((item) => item.to)).toEqual(["/api-keys", "/api-keys/interfaces"]);
  });

  it("keeps announcements as an independent settings route", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/announcements",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          name: "Member User",
          role: "member",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.activePrimaryId).toBe("announcements");
    expect(shell.routeLabel).toBe("公告");
    expect(shell.secondaryNav).toEqual([]);
  });

  it("places operations between system settings and profile in the system secondary navigation", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/system/operations",
      session: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "admin",
          status: "active",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });

    expect(shell.activePrimaryId).toBe("system");
    expect(shell.routeLabel).toBe("运维中心");
    expect(shell.secondaryNav.map((item) => item.label)).toEqual(["系统设置", "运维中心", "个人设置", "关于我们"]);
    expect(shell.secondaryNav.map((item) => item.to)).toEqual([
      "/system/settings",
      "/system/operations",
      "/system/profile",
      "/system/about"
    ]);
  });
});
