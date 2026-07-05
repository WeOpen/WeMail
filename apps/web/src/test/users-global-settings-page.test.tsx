import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps, FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminGovernanceSummary, CommercialModelSummary, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { UsersGlobalSettingsPage } from "../pages/UsersGlobalSettingsPage";
import type { InviteSummary } from "../features/admin/types";

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
    maxRedemptions: 1,
    redemptionCount: 0,
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

const adminMailboxes: MailboxSummary[] = [
  { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }
];

function createQuotaUsers(count: number): UserSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const userNumber = index + 1;
    return {
      id: userNumber === 1 ? "admin-1" : `member-${userNumber}`,
      email: userNumber === 1 ? "admin@example.com" : `member-${userNumber}@example.com`,
      name: userNumber === 1 ? "Admin User" : `Member ${userNumber}`,
      role: userNumber === 1 ? "admin" : "member",
      status: "active",
      createdAt: "2026-04-08T00:00:00.000Z",
      updatedAt: "2026-04-08T00:00:00.000Z"
    };
  });
}

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
      detail: "用户 Member User",
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
      maxRedemptions: 1,
      redemptionCount: 0,
      redeemedByUserId: null,
      redeemedAt: null,
      disabledAt: null
    };
  });
}

type UsersGlobalSettingsPageRenderProps = ComponentProps<typeof UsersGlobalSettingsPage>;

function createUsersGlobalSettingsProps(
  overrides: Partial<UsersGlobalSettingsPageRenderProps> = {}
): UsersGlobalSettingsPageRenderProps {
  return {
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

    expect(screen.getByRole("region", { name: "邀请流程" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "安全治理" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "商业与团队模型" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "配额限制" })).toBeInTheDocument();
    const mainColumn = document.querySelector(".users-global-main-column");
    const sectionLabels = Array.from(mainColumn?.children ?? [], (child) => child.getAttribute("aria-label"));
    expect(sectionLabels.indexOf("配额限制")).toBeLessThan(sectionLabels.indexOf("安全治理"));
    expect(screen.queryByRole("heading", { name: "邀请与入场" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "登录、审计与限流" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "套餐、团队与配额" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "配额策略" })).not.toBeInTheDocument();
    expect(screen.queryByText("创建、停用并查看邀请码状态，无需离开当前控制台。")).not.toBeInTheDocument();
    expect(screen.queryByText("集中查看登录历史、风险操作、邀请码兑换和关键流量策略。")).not.toBeInTheDocument();
    expect(screen.queryByText("选择成员后，可调整每日外发额度，并暂停异常用户的外发能力。")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "能力开关" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "邮箱监管" })).not.toBeInTheDocument();
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
    const quotaPanel = screen.getByRole("region", { name: "配额限制" });
    const quotaUsers = within(quotaPanel).getByRole("region", { name: "配额用户" });
    const quotaTargetColumn = quotaPanel.querySelector(".users-quota-target-column");
    const quotaTarget = within(quotaPanel).getByRole("region", { name: "当前配额目标" });

    expect(quotaPanel.querySelector(".users-quota-layout")).not.toBeNull();
    expect(quotaUsers.querySelector(".users-quota-user-list")).not.toBeNull();
    expect(quotaTargetColumn).not.toBeNull();
    expect(within(quotaTargetColumn as HTMLElement).getByRole("form", { name: "保存用户配额" })).toBeInTheDocument();
    expect(within(quotaTarget).getByText("当前配额目标")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("Admin User")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("admin@example.com")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("0 / 20")).toBeInTheDocument();
    expect(within(quotaTarget).getByText("12 / 20000")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "API 每日调用上限" })).toHaveValue(20000);
  });

  it("renders governance login history, audit events, rate limits, and invite analytics", () => {
    renderUsersGlobalSettings();

    const governancePanel = screen.getByRole("region", { name: "安全治理" });
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

  it("renders commercial plan tiers and quota usage without team workspace or organization audit cards", () => {
    renderUsersGlobalSettings();

    const commercialPanel = screen.getByRole("region", { name: "商业与团队模型" });
    const planGrid = within(commercialPanel).getByLabelText("套餐层级");

    expect(within(planGrid).getByText("免费版").closest(".users-commercial-plan")).toHaveAttribute("data-plan", "free");
    expect(within(planGrid).getByText("高级版").closest(".users-commercial-plan")).toHaveAttribute("data-plan", "pro");
    expect(within(planGrid).getByText("团队版").closest(".users-commercial-plan")).toHaveAttribute("data-plan", "team");
    expect(within(commercialPanel).getByLabelText("组织级用量")).toHaveTextContent("8 / 100");
    expect(within(commercialPanel).getByLabelText("组织级用量")).toHaveTextContent("12 / 40000");
    expect(within(commercialPanel).queryByLabelText("默认团队空间")).not.toBeInTheDocument();
    expect(within(commercialPanel).queryByLabelText("组织级审计")).not.toBeInTheDocument();
  });

  it("keeps the invite and quota controls wired to callbacks", async () => {
    const onCreateInvite = vi.fn();
    const onDisableInvite = vi.fn();
    const onSelectQuotaUser = vi.fn();
    const onSubmitQuota = vi.fn(async (event: FormEvent<HTMLFormElement>) => event.preventDefault());

    renderUsersGlobalSettings({
      onCreateInvite,
      onDisableInvite,
      onSelectQuotaUser,
      onSubmitQuota
    });

    const invitePanel = screen.getByRole("region", { name: "邀请流程" });
    const createInviteButton = within(invitePanel).getByRole("button", { name: "创建邀请码" });
    expect(createInviteButton).toHaveClass("ui-button-size-md");
    expect(createInviteButton.querySelector("svg")).not.toBeNull();

    fireEvent.click(createInviteButton);
    const createInviteDialog = await screen.findByRole("dialog", { name: "创建邀请码" });
    expect(within(createInviteDialog).getByRole("combobox", { name: "邀请码目标角色" })).toBeInTheDocument();
    expect(within(createInviteDialog).getByRole("combobox", { name: "邀请码有效期" })).toBeInTheDocument();
    expect(within(createInviteDialog).getByRole("combobox", { name: "邀请码创建数量" })).toBeInTheDocument();
    const maxRedemptionsInput = within(createInviteDialog).getByRole("spinbutton", { name: "邀请码可用次数" });
    expect(maxRedemptionsInput).toHaveValue(1);
    fireEvent.change(maxRedemptionsInput, { target: { value: "3" } });
    fireEvent.click(within(createInviteDialog).getByRole("button", { name: "创建邀请码" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "创建邀请码" })).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "停用邀请码 ALPHA-2026" }));
    fireEvent.click(screen.getByRole("button", { name: /Member User.*member@example.com/ }));
    fireEvent.submit(screen.getByRole("form", { name: "保存用户配额" }));

    expect(onCreateInvite).toHaveBeenCalledWith({
      count: 1,
      targetRole: "member",
      expiresInDays: 30,
      maxRedemptions: 3
    });
    expect(onDisableInvite).toHaveBeenCalledWith("invite-1");
    expect(onSelectQuotaUser).toHaveBeenCalledWith("member-1");
    expect(onSubmitQuota).toHaveBeenCalledWith(expect.anything(), "admin-1");
    const disableInviteButton = screen.getByRole("button", { name: "停用邀请码 ALPHA-2026" });
    const inviteRow = disableInviteButton.closest(".users-settings-row");
    expect(disableInviteButton).toHaveClass("ui-button-size-sm");
    expect(inviteRow).not.toBeNull();
    expect(within(inviteRow as HTMLElement).getByText("可用")).toHaveClass("users-invite-status-badge");
    expect(within(inviteRow as HTMLElement).getByText(/成员/)).toBeInTheDocument();
    expect(within(inviteRow as HTMLElement).getByText(/有效期至 2026-12-08/)).toBeInTheDocument();
    const saveQuotaButton = screen.getByRole("button", { name: "保存配额" });
    expect(saveQuotaButton).toHaveClass("ui-button-size-sm");
    expect(saveQuotaButton.querySelector("svg")).not.toBeNull();
  });

  it("paginates quota users through the backend callback", () => {
    const onQuotaUsersPageChange = vi.fn();

    renderUsersGlobalSettings({
      adminSettingsUsers: createQuotaUsers(5),
      adminSettingsUsersPage: 1,
      adminSettingsUsersPageSize: 5,
      adminSettingsUsersTotal: 7,
      onQuotaUsersPageChange
    });

    const quotaPanel = screen.getByRole("region", { name: "配额限制" });
    const quotaUsers = within(quotaPanel).getByRole("region", { name: "配额用户" });
    const quotaPagination = within(quotaUsers).getByRole("navigation", { name: "配额用户分页" });

    expect(within(quotaUsers).getByText("Member 5")).toBeInTheDocument();
    expect(within(quotaUsers).queryByText("Member 6")).not.toBeInTheDocument();
    expect(quotaPagination).toHaveClass("users-quota-pagination");
    fireEvent.click(within(quotaPagination).getByRole("button", { name: "下一页" }));

    expect(onQuotaUsersPageChange).toHaveBeenCalledWith(2);
  });

  it("shows the redeemed invite user name instead of the user id", () => {
    renderUsersGlobalSettings({
      adminInvites: [
        {
          ...adminInvites[0],
          id: "invite-redeemed",
          code: "INVITE-REDEEMED",
          redeemedByUserId: "member-1",
          redemptionCount: 1,
          redeemedAt: "2026-06-08T08:00:00.000Z"
        }
      ]
    });

    const invitePanel = screen.getByRole("region", { name: "邀请流程" });

    expect(within(invitePanel).getByText("兑换用户 Member User")).toBeInTheDocument();
    expect(within(invitePanel).queryByText(/member-1/)).not.toBeInTheDocument();
  });

  it("paginates invites with five rows per page", () => {
    renderUsersGlobalSettings({
      adminInvites: createInvites(7)
    });

    const invitePanel = screen.getByRole("region", { name: "邀请流程" });

    expect(invitePanel).not.toBeNull();

    const inviteList = invitePanel.querySelector(".users-settings-list");
    const invitePagination = within(invitePanel).getByRole("navigation", { name: "邀请码分页" });

    expect(inviteList).not.toBeNull();
    expect(invitePagination).toHaveClass("users-list-pagination");
    expect(invitePagination).toHaveClass("ui-pagination-with-meta");
    expect(within(invitePagination).getByText("共 7 条")).toBeInTheDocument();
    expect(within(invitePagination).getByRole("combobox", { name: "每页条数" })).toBeInTheDocument();

    expect(within(inviteList as HTMLElement).getByText("INVITE-001")).toBeInTheDocument();
    expect(within(inviteList as HTMLElement).getByText("INVITE-005")).toBeInTheDocument();
    expect(within(inviteList as HTMLElement).queryByText("INVITE-006")).not.toBeInTheDocument();
    fireEvent.click(within(invitePanel).getByRole("button", { name: "下一页" }));
    expect(within(inviteList as HTMLElement).queryByText("INVITE-001")).not.toBeInTheDocument();
    expect(within(inviteList as HTMLElement).getByText("INVITE-006")).toBeInTheDocument();
  });
});
