import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

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
  { id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }
];

const adminQuota: QuotaSummary = {
  userId: "admin-1",
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

function createInvites(count: number): InviteSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const inviteNumber = index + 1;
    return {
      id: `invite-${inviteNumber}`,
      code: `INVITE-${String(inviteNumber).padStart(3, "0")}`,
      createdAt: `2026-04-${String(inviteNumber).padStart(2, "0")}T00:00:00.000Z`,
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

    expect(onCreateInvite).toHaveBeenCalledTimes(1);
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
