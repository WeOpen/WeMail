import type { FormEvent } from "react";
import { Mailbox, TicketCheck, UserCheck, Users, type LucideIcon } from "lucide-react";

import type { AdminGovernanceSummary, CommercialModelSummary, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { CommercialModelPanel } from "../features/admin/CommercialModelPanel";
import { GovernancePanel } from "../features/admin/GovernancePanel";
import { InvitePanel } from "../features/admin/InvitePanel";
import { QuotaPanel } from "../features/admin/QuotaPanel";
import type { AdminUserStats, InviteCreatePayload, InviteSummary } from "../features/admin/types";
import { MetricCard } from "../shared/metric-card";
import { Page, PageMain } from "../shared/page-layout";

type UsersGlobalSettingsPageProps = {
  adminUsers: UserSummary[];
  adminSettingsUsers?: UserSummary[];
  adminSettingsUsersPage?: number;
  adminSettingsUsersPageSize?: number;
  adminSettingsUsersTotal?: number;
  adminUserStats?: AdminUserStats;
  adminInvites: InviteSummary[];
  adminInvitesAvailable?: number;
  adminInvitesPage?: number;
  adminInvitesPageSize?: number;
  adminInvitesTotal?: number;
  adminQuota: QuotaSummary | null;
  adminMailboxes: MailboxSummary[];
  adminMailboxesTotal?: number;
  adminGovernance?: AdminGovernanceSummary | null;
  adminCommercial?: CommercialModelSummary | null;
  onCreateInvite: (payload: InviteCreatePayload) => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
  onInvitePageChange?: (page: number) => Promise<void>;
  onInvitePageSizeChange?: (pageSize: number) => Promise<void>;
  onQuotaUsersPageChange?: (page: number) => Promise<void>;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

function isInviteAvailable(invite: InviteSummary) {
  const redemptionCount = invite.redemptionCount ?? (invite.redeemedAt ? 1 : 0);
  const maxRedemptions = invite.maxRedemptions ?? 1;
  return invite.status === "ready" || (!invite.status && redemptionCount < maxRedemptions && !invite.disabledAt);
}

export function UsersGlobalSettingsPage({
  adminUsers,
  adminSettingsUsers,
  adminSettingsUsersPage,
  adminSettingsUsersPageSize,
  adminSettingsUsersTotal,
  adminUserStats,
  adminInvites,
  adminInvitesAvailable,
  adminInvitesPage,
  adminInvitesPageSize,
  adminInvitesTotal,
  adminQuota,
  adminMailboxes,
  adminMailboxesTotal,
  adminGovernance = null,
  adminCommercial = null,
  onCreateInvite,
  onDisableInvite,
  onInvitePageChange,
  onInvitePageSizeChange,
  onQuotaUsersPageChange,
  onSelectQuotaUser,
  onSubmitQuota
}: UsersGlobalSettingsPageProps) {
  const settingsUsers = adminSettingsUsers ?? adminUsers;
  const inviteDisplayUsers = adminSettingsUsers ? [...adminUsers, ...adminSettingsUsers] : adminUsers;
  const activeUsers = adminUserStats?.active ?? adminUsers.filter((user) => user.status === "active").length;
  const totalUsers = adminUserStats?.total ?? adminUsers.length;
  const availableInvites = adminInvitesAvailable ?? adminInvites.filter(isInviteAvailable).length;
  const totalMailboxes = adminMailboxesTotal ?? adminMailboxes.length;
  const statCards: Array<{
    detail: string;
    icon: LucideIcon;
    title: string;
    value: number;
  }> = [
    { detail: "全部账号", icon: Users, title: "用户总数", value: totalUsers },
    { detail: "状态正常", icon: UserCheck, title: "活跃用户", value: activeUsers },
    { detail: "可继续分发", icon: TicketCheck, title: "可用邀请码", value: availableInvites },
    { detail: "全局邮箱", icon: Mailbox, title: "邮箱总数", value: totalMailboxes }
  ];

  return (
    <Page as="main" className="workspace-grid users-global-grid">
      <section aria-label="用户设置概览" className="users-settings-summary-grid">
        {statCards.map((card) => {
          const StatIcon = card.icon;
          return (
            <MetricCard
              className="panel workspace-card dashboard-kpi-card users-settings-stat-card"
              detail={card.detail}
              key={card.title}
              title={card.title}
              value={card.value}
              valueSize="lg"
              visualIcon={<StatIcon absoluteStrokeWidth aria-hidden="true" strokeWidth={1.7} />}
            />
          );
        })}
      </section>

      <PageMain className="users-global-content-grid">
        <div className="users-global-main-column">
          <InvitePanel
            adminInvites={adminInvites}
            invitesAvailable={adminInvitesAvailable}
            invitesPage={adminInvitesPage}
            invitesPageSize={adminInvitesPageSize}
            invitesTotal={adminInvitesTotal}
            users={inviteDisplayUsers}
            onCreateInvite={onCreateInvite}
            onDisableInvite={onDisableInvite}
            onInvitePageChange={onInvitePageChange}
            onInvitePageSizeChange={onInvitePageSizeChange}
          />
          <CommercialModelPanel commercial={adminCommercial} />
          <QuotaPanel
            adminUsers={settingsUsers}
            adminQuota={adminQuota}
            quotaUsersPage={adminSettingsUsersPage}
            quotaUsersPageSize={adminSettingsUsersPageSize}
            quotaUsersTotal={adminSettingsUsersTotal}
            onQuotaUsersPageChange={onQuotaUsersPageChange}
            onSelectQuotaUser={onSelectQuotaUser}
            onSubmitQuota={onSubmitQuota}
          />
          <GovernancePanel governance={adminGovernance} />
        </div>
      </PageMain>
    </Page>
  );
}
