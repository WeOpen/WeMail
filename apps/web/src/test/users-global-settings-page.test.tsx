import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { UsersGlobalSettingsPage } from "../pages/UsersGlobalSettingsPage";
import type { InviteSummary } from "../features/admin/types";

const adminUsers: UserSummary[] = [
  { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
  { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
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

describe("UsersGlobalSettingsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the global control sections for users settings", () => {
    render(
      <UsersGlobalSettingsPage
        adminFeatures={adminFeatures}
        adminInvites={adminInvites}
        adminMailboxes={adminMailboxes}
        adminQuota={adminQuota}
        adminUsers={adminUsers}
        onCreateInvite={vi.fn()}
        onDisableInvite={vi.fn()}
        onSelectQuotaUser={vi.fn()}
        onSubmitQuota={vi.fn()}
        onToggleFeatures={vi.fn()}
      />
    );

    expect(screen.getByText("用户设置")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "邀请码控制" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "配额控制" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "系统开关" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "邮箱总览" })).toBeInTheDocument();
  });
});