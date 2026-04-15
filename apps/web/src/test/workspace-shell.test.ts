import { describe, expect, it, vi } from "vitest";

import { buildWorkspaceShellState } from "../app/workspaceShell";

describe("buildWorkspaceShellState", () => {
  it("builds grouped primary navigation and mail secondary navigation for mail routes", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/mail/list",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          role: "member",
          createdAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      },
      inbox: {
        mailboxes: [],
        messages: [],
        outboundHistory: [],
        selectedMailboxId: null
      },
      settings: {
        apiKeys: [],
        telegram: null
      },
      admin: {
        adminUsers: [],
        adminInvites: [],
        adminQuota: null,
        adminMailboxes: []
      },
      onOpenMailboxComposer: vi.fn()
    });

    expect(shell.activePrimaryId).toBe("mail");
    expect(shell.routeLabel).toBe("邮件列表");
    expect(shell.secondaryNav.map((item) => item.label)).toEqual(["邮件列表", "无收件人邮件", "发件箱", "邮件设置"]);

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
            hint: "账号列表 · 创建账号 · 账号设置"
          },
          {
            id: "mail",
            icon: "mail",
            label: "邮件",
            to: "/mail/list",
            hint: "邮件列表 · 无收件人邮件 · 发件箱 · 邮件设置"
          }
        ]
      },
      {
        title: "设置",
        items: [
          { id: "api-keys", icon: "keys", label: "API 密钥", to: "/api-keys", hint: undefined },
          { id: "webhook", icon: "webhook", label: "Webhook", to: "/webhook", hint: undefined },
          { id: "telegram", icon: "telegram", label: "Telegram", to: "/telegram", hint: undefined },
          { id: "docs", icon: "docs", label: "文档", to: "/docs", hint: undefined },
          { id: "announcements", icon: "announcements", label: "公告", to: "/announcements", hint: undefined },
          {
            id: "system",
            icon: "system",
            label: "系统设置",
            to: "/system/appearance",
            hint: "外观设置 · 个人设置"
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
          role: "member",
          createdAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      },
      inbox: {
        mailboxes: [],
        messages: [],
        outboundHistory: [],
        selectedMailboxId: null
      },
      settings: {
        apiKeys: [],
        telegram: null
      },
      admin: {
        adminUsers: [],
        adminInvites: [],
        adminQuota: null,
        adminMailboxes: []
      },
      onOpenMailboxComposer: vi.fn()
    });

    expect(shell.railSections[0]?.items.some((item) => item.label === "用户")).toBe(false);
  });
});
