import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminGovernanceSummary, CommercialModelSummary, FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { UsersGlobalSettingsPage } from "../pages/UsersGlobalSettingsPage";
import type { InviteSummary } from "../features/admin/types";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

const adminUsers: UserSummary[] = [
  {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    status: "active",
    createdAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z"
  },
  {
    id: "member-1",
    email: "member@example.com",
    name: "Member User",
    role: "member",
    status: "active",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z"
  }
];

const adminInvites: InviteSummary[] = [
  {
    id: "invite-1",
    code: "ALPHA-2026",
    createdAt: "2026-04-08T00:00:00.000Z",
    expiresAt: "2026-12-08T00:00:00.000Z",
    targetRole: "member",
    redeemedByUserId: null,
    redeemedAt: null,
    disabledAt: null
  }
];

const adminQuota: QuotaSummary = {
  userId: "admin-1",
  apiDailyLimit: 20000,
  apiCallsToday: 12,
  dailyLimit: 20,
  sendsToday: 0,
  disabled: false,
  updatedAt: "2026-04-08T00:00:00.000Z"
};

const adminFeatures: FeatureToggles = {
  aiEnabled: true,
  telegramEnabled: true,
  outboundEnabled: true,
  mailboxCreationEnabled: true
};

const adminMailboxes: MailboxSummary[] = [
  { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }
];

const adminGovernance: AdminGovernanceSummary = {
  generatedAt: "2026-06-28T00:00:00.000Z",
  inviteStats: {
    total: 6,
    available: 3,
    redeemed: 2,
    disabled: 1,
    expired: 0
  },
  loginHistory: [
    {
      id: "login-1",
      userId: "admin-1",
      userEmail: "admin@example.com",
      method: "password",
      provider: null,
      status: "success",
      reason: null,
      ipAddress: "203.0.113.10",
      userAgent: "Chrome",
      createdAt: "2026-06-28T08:30:00.000Z"
    },
    {
      id: "login-2",
      userId: null,
      userEmail: "member@example.com",
      method: "oauth",
      provider: "github",
      status: "failed",
      reason: "invalid_invite",
      ipAddress: "198.51.100.12",
      userAgent: "Firefox",
      createdAt: "2026-06-28T08:20:00.000Z"
    }
  ],
  auditEvents: [
    {
      id: "audit-1",
      actorId: "admin-1",
      actorLabel: "Admin User / admin@example.com",
      eventType: "invite-create",
      eventLabel: "创建邀请码",
      detail: "数量 5，角色 member",
      createdAt: "2026-06-28T08:10:00.000Z"
    }
  ],
  rateLimits: [
    {
      key: "login",
      label: "登录",
      scope: "IP + /api/auth/login",
      policy: "Cloudflare Rate Limiter",
      currentUsage: "平台限流器接管",
      enforced: true
    },
    {
      key: "register",
      label: "注册",
      scope: "IP + /api/auth/register",
      policy: "Cloudflare Rate Limiter",
      currentUsage: "未绑定 RATE_LIMITER",
      enforced: false
    }
  ]
};

const adminCommercial: CommercialModelSummary = {
  generatedAt: "2026-06-28T00:00:00.000Z",
  currentPlanId: "team",
  planTiers: [
    {
      id: "free",
      name: "免费版",
      priceLabel: "¥0",
      mailboxLimit: 5,
      retentionDays: 7,
      apiDailyLimit: 20000,
      outboundDailyLimit: 20,
      webhookLimit: 1,
      teamSeats: 1,
      features: ["基础收件"]
    },
    {
      id: "pro",
      name: "高级版",
      priceLabel: "按月订阅",
      mailboxLimit: 20,
      retentionDays: 30,
      apiDailyLimit: 100000,
      outboundDailyLimit: 100,
      webhookLimit: 10,
      teamSeats: 3,
      features: ["更高配额"]
    },
    {
      id: "team",
      name: "团队版",
      priceLabel: "联系销售",
      mailboxLimit: 100,
      retentionDays: 90,
      apiDailyLimit: 400000,
      outboundDailyLimit: 400,
      webhookLimit: 50,
      teamSeats: 25,
      features: ["团队空间"]
    }
  ],
  quotaUsage: {
    users: 2,
    activeUsers: 2,
    mailboxes: 8,
    mailboxLimit: 100,
    messages: 120,
    outboundDailyLimit: 40,
    outboundSentToday: 2,
    apiDailyLimit: 40000,
    apiCallsToday: 12,
    webhookEndpoints: 3
  },
  teamWorkspaces: [
    {
      id: "default",
      name: "WeMail 默认组织",
      planId: "team",
      memberCount: 2,
      adminCount: 1,
      sharedMailboxCount: 8,
      auditEventCount: 12,
      usage: {
        mailboxes: 8,
        messages: 120,
        outboundSentToday: 2,
        apiCallsToday: 12
      }
    }
  ],
  organizationAudit: [
    {
      id: "audit-commercial-1",
      actorId: "admin-1",
      actorLabel: "Admin User / admin@example.com",
      eventType: "quota-update",
      eventLabel: "更新配额",
      detail: "用户 member-1",
      createdAt: "2026-06-28T08:00:00.000Z"
    }
  ]
};

function createInvites(count: number): InviteSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const inviteNumber = index + 1;
    return {
      id: `invite-${inviteNumber}`,
      code: `INVITE-${String(inviteNumber).padStart(3, "0")}`,
      createdAt: `2026-04-${String(inviteNumber).padStart(2, "0")}T00:00:00.000Z`,
      expiresAt: null,
      targetRole: "member",
      redeemedByUserId: null,
      redeemedAt: null,
      disabledAt: null
    };
  });
}

function createMailboxes(count: number): MailboxSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const mailboxNumber = index + 1;
    return {
      id: `box-${mailboxNumber}`,
      address: `box${mailboxNumber}@example.com`,
      label: `Mailbox ${mailboxNumber}`,
      createdAt: `2026-05-${String(mailboxNumber).padStart(2, "0")}T00:00:00.000Z`
    };
  });
}

type UsersGlobalSettingsPageRenderProps = ComponentProps<typeof UsersGlobalSettingsPage>;

function createUsersGlobalSettingsProps(
  overrides: Partial<UsersGlobalSettingsPageRenderProps> = {}
): UsersGlobalSettingsPageRenderProps {
  return {
    adminFeatures,
    adminCommercial,
    adminGovernance,
    adminInvites,
    adminMailboxes,
    adminQuota,
    adminUsers,
    onCreateInvite: vi.fn(),
    onDisableInvite: vi.fn(),
    onSelectQuotaUser: vi.fn(),
    onSubmitQuota: vi.fn(async (event) => event.preventDefault()),
    onToggleFeatures: vi.fn(),
    ...overrides
  };
}

function renderUsersGlobalSettings(overrides: Partial<UsersGlobalSettingsPageRenderProps> = {}) {
  const props = createUsersGlobalSettingsProps(overrides);
  return {
    props,
    ...render(<UsersGlobalSettingsPage {...props} />)
  };
}

describe("UsersGlobalSettingsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the global control sections for users settings", () => {
    renderUsersGlobalSettings();

    expect(screen.getByRole("heading", { name: "邀请与入场" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "登录、审计与限流" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "套餐、团队与配额" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "配额策略" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "能力开关" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "邮箱监管" })).toBeInTheDocument();
  });

  it("starts directly with settings metrics without rendering the intro header", () => {
    renderUsersGlobalSettings();

    expect(screen.queryByText("用户设置")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "用户设置中心" })).not.toBeInTheDocument();
    expect(screen.queryByText(/集中管理入场邀请/)).not.toBeInTheDocument();
  });

  it("summarizes users settings with live admin data", () => {
    renderUsersGlobalSettings();

    const overview = screen.getByRole("region", { name: "用户设置概览" });

    expect(within(overview).getByText("用户总数")).toBeInTheDocument();
    expect(within(overview).getByText("活跃用户")).toBeInTheDocument();
    expect(within(overview).getByText("可用邀请码")).toBeInTheDocument();
    expect(within(overview).getByText("邮箱总数")).toBeInTheDocument();
    expect(within(overview).getAllByText("2")).toHaveLength(2);
    expect(within(overview).getAllByText("1")).toHaveLength(2);
    const quotaTarget = screen.getByRole("region", { name: "当前配额目标" });
    expect(within(quotaTarget).getByText("当前配额目标")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("Admin User")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("admin@example.com")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("0 / 20")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("12 / 20000")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "API 每日调用上限" })).toHaveValue(20000);
  });

  it("renders governance login history, audit events, rate limits, and invite analytics", () => {
    renderUsersGlobalSettings();

    const governancePanel = screen.getByRole("heading", { name: "登录、审计与限流" }).closest("section");
    expect(governancePanel).not.toBeNull();

    expect(within(governancePanel as HTMLElement).getByText("登录历史")).toBeInTheDocument();
    expect(within(governancePanel as HTMLElement).getByText("风险审计")).toBeInTheDocument();
    expect(within(governancePanel as HTMLElement).getAllByText("限流策略").length).toBeGreaterThan(0);
    expect(within(governancePanel as HTMLElement).getByText("member@example.com")).toBeInTheDocument();
    expect(governancePanel).toHaveTextContent("OAuth / github");
    expect(within(governancePanel as HTMLElement).getByText("创建邀请码")).toBeInTheDocument();
    expect(governancePanel).toHaveTextContent("数量 5，角色 member");
    expect(within(governancePanel as HTMLElement).getByText("3")).toBeInTheDocument();
    expect(governancePanel).toHaveTextContent("1 / 2");
    expect(within(governancePanel as HTMLElement).getByText("待绑定")).toBeInTheDocument();
  });

  it("renders commercial plan tiers, team workspace, quota usage, and organization audit", () => {
    renderUsersGlobalSettings();

    const commercialPanel = screen.getByRole("region", { name: "商业与团队模型" });

    expect(within(commercialPanel).getAllByText("团队版").length).toBeGreaterThan(0);
    expect(within(commercialPanel).getByLabelText("组织级用量")).toHaveTextContent("8 / 100");
    expect(within(commercialPanel).getByLabelText("组织级用量")).toHaveTextContent("12 / 40000");
    expect(within(commercialPanel).getByLabelText("默认团队空间")).toHaveTextContent("WeMail 默认组织");
    expect(within(commercialPanel).getByLabelText("默认团队空间")).toHaveTextContent("共享邮箱");
    expect(within(commercialPanel).getByLabelText("组织级审计")).toHaveTextContent("更新配额");
  });

  it("sizes the feature status badge to cover its enabled summary", () => {
    renderUsersGlobalSettings();

    expect(screen.getByText("4 / 4 启用")).toHaveClass("users-feature-status-badge");
    expect(sharedStyles).toMatch(/\.users-feature-status-badge\s*\{[^}]*padding:\s*10px 18px;/);
  });

  it("stacks mailbox name, address, and creation time in each mailbox row", () => {
    renderUsersGlobalSettings();

    const mailboxPanel = screen.getByRole("heading", { name: "邮箱监管" }).closest("section");
    expect(mailboxPanel).not.toBeNull();

    const mailboxList = mailboxPanel!.querySelector(".users-settings-list");
    expect(mailboxList).not.toBeNull();

    const mailboxRow = within(mailboxList as HTMLElement).getByText("Ops").closest(".users-mailbox-row");
    expect(mailboxRow).not.toBeNull();
    expect(sharedStyles).toMatch(/\.users-mailbox-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);

    const mailboxDetails = mailboxRow!.querySelector(".users-mailbox-row-details");
    expect(mailboxDetails).not.toBeNull();
    expect(
      Array.from(
        mailboxRow!.querySelectorAll(".users-mailbox-row-name, .users-mailbox-row-address, .users-mailbox-row-created")
      ).map((element) => element.textContent)
    ).toEqual(["Ops", "ops@example.com", "创建于 2026-04-08"]);
  });

  it("keeps the invite, quota, and feature controls wired to callbacks", () => {
    const onCreateInvite = vi.fn();
    const onDisableInvite = vi.fn();
    const onSelectQuotaUser = vi.fn();
    const onSubmitQuota = vi.fn(async (event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onToggleFeatures = vi.fn();

    renderUsersGlobalSettings({
      onCreateInvite,
      onDisableInvite,
      onSelectQuotaUser,
      onSubmitQuota,
      onToggleFeatures
    });

    fireEvent.click(screen.getByRole("button", { name: "创建邀请码" }));
    fireEvent.click(screen.getByRole("button", { name: "停用邀请码 ALPHA-2026" }));
    fireEvent.click(screen.getByRole("button", { name: /Member User.*member@example.com/ }));
    fireEvent.submit(screen.getByRole("form", { name: "保存用户配额" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "AI 提取" }));

    expect(onCreateInvite).toHaveBeenCalledWith({
      count: 1,
      targetRole: "member",
      expiresInDays: 30
    });
    expect(onDisableInvite).toHaveBeenCalledWith("invite-1");
    expect(onSelectQuotaUser).toHaveBeenCalledWith("member-1");
    expect(onSubmitQuota).toHaveBeenCalledWith(expect.anything(), "admin-1");
    expect(onToggleFeatures).toHaveBeenCalledWith({
      ...adminFeatures,
      aiEnabled: false
    });
    expect(screen.getByRole("button", { name: "创建邀请码" })).toHaveClass("ui-button-size-sm");
    const disableInviteButton = screen.getByRole("button", { name: "停用邀请码 ALPHA-2026" });
    const inviteRow = disableInviteButton.closest(".users-settings-row");
    expect(disableInviteButton).toHaveClass("ui-button-size-sm");
    expect(inviteRow).not.toBeNull();
    expect(within(inviteRow as HTMLElement).getByText("可用")).toHaveClass("users-invite-status-badge");
    expect(within(inviteRow as HTMLElement).getByText(/成员/)).toBeInTheDocument();
    expect(within(inviteRow as HTMLElement).getByText(/有效期至 2026-12-08/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存配额" })).toHaveClass("ui-button-size-sm");
  });

  it("paginates invites and mailboxes with five rows per page", () => {
    renderUsersGlobalSettings({
      adminInvites: createInvites(7),
      adminMailboxes: createMailboxes(6)
    });

    const invitePanel = screen.getByRole("heading", { name: "邀请与入场" }).closest("section");
    const mailboxPanel = screen.getByRole("heading", { name: "邮箱监管" }).closest("section");

    expect(invitePanel).not.toBeNull();
    expect(mailboxPanel).not.toBeNull();

    const inviteList = invitePanel!.querySelector(".users-settings-list");
    const mailboxList = mailboxPanel!.querySelector(".users-settings-list");

    expect(inviteList).not.toBeNull();
    expect(mailboxList).not.toBeNull();

    expect(within(inviteList as HTMLElement).getByText("INVITE-001")).toBeInTheDocument();
    expect(within(inviteList as HTMLElement).getByText("INVITE-005")).toBeInTheDocument();
    expect(within(inviteList as HTMLElement).queryByText("INVITE-006")).not.toBeInTheDocument();
    fireEvent.click(within(invitePanel!).getByRole("button", { name: "下一页" }));
    expect(within(inviteList as HTMLElement).queryByText("INVITE-001")).not.toBeInTheDocument();
    expect(within(inviteList as HTMLElement).getByText("INVITE-006")).toBeInTheDocument();

    expect(within(mailboxList as HTMLElement).getByText("Mailbox 1")).toBeInTheDocument();
    expect(within(mailboxList as HTMLElement).getByText("Mailbox 5")).toBeInTheDocument();
    expect(within(mailboxList as HTMLElement).queryByText("Mailbox 6")).not.toBeInTheDocument();
    fireEvent.click(within(mailboxPanel!).getByRole("button", { name: "下一页" }));
    expect(within(mailboxList as HTMLElement).queryByText("Mailbox 1")).not.toBeInTheDocument();
    expect(within(mailboxList as HTMLElement).getByText("Mailbox 6")).toBeInTheDocument();
  });
});
