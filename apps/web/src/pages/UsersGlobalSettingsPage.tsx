import type { FormEvent } from "react";
import { Mailbox, TicketCheck, UserCheck, Users, type LucideIcon } from "lucide-react";

import type { FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { FeatureTogglesPanel } from "../features/admin/FeatureTogglesPanel";
import { InvitePanel } from "../features/admin/InvitePanel";
import { MailboxOversightPanel } from "../features/admin/MailboxOversightPanel";
import { QuotaPanel } from "../features/admin/QuotaPanel";
import type { AdminUserStats, InviteSummary } from "../features/admin/types";
import { MetricCard } from "../shared/metric-card";
import { Page, PageMain } from "../shared/page-layout";

type UsersGlobalSettingsPageProps = {
  adminUsers: UserSummary[];
  adminSettingsUsers?: UserSummary[];
  adminUserStats?: AdminUserStats;
  adminInvites: InviteSummary[];
  adminInvitesAvailable?: number;
  adminInvitesPage?: number;
  adminInvitesPageSize?: number;
  adminInvitesTotal?: number;
  adminQuota: QuotaSummary | null;
  adminFeatures: FeatureToggles | null;
  adminMailboxes: MailboxSummary[];
  adminLatestMailbox?: MailboxSummary | null;
  adminMailboxesPage?: number;
  adminMailboxesPageSize?: number;
  adminMailboxesTotal?: number;
  onCreateInvite: () => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
  onInvitePageChange?: (page: number) => Promise<void>;
  onMailboxPageChange?: (page: number) => Promise<void>;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
  onToggleFeatures: (nextFeatureToggles: FeatureToggles) => Promise<void>;
};

function isInviteAvailable(invite: InviteSummary) {
  return invite.status === "ready" || (!invite.status && !invite.redeemedAt && !invite.disabledAt);
}

export function UsersGlobalSettingsPage({
  adminUsers,
  adminSettingsUsers,
  adminUserStats,
  adminInvites,
  adminInvitesAvailable,
  adminInvitesPage,
  adminInvitesPageSize,
  adminInvitesTotal,
  adminQuota,
  adminFeatures,
  adminMailboxes,
  adminLatestMailbox,
  adminMailboxesPage,
  adminMailboxesPageSize,
  adminMailboxesTotal,
  onCreateInvite,
  onDisableInvite,
  onInvitePageChange,
  onMailboxPageChange,
  onSelectQuotaUser,
  onSubmitQuota,
  onToggleFeatures
}: UsersGlobalSettingsPageProps) {
  const settingsUsers = adminSettingsUsers ?? adminUsers;
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
            onCreateInvite={onCreateInvite}
            onDisableInvite={onDisableInvite}
            onInvitePageChange={onInvitePageChange}
          />
          <QuotaPanel
            adminUsers={settingsUsers}
            adminQuota={adminQuota}
            onSelectQuotaUser={onSelectQuotaUser}
            onSubmitQuota={onSubmitQuota}
          />
        </div>
        <div className="users-global-side-column">
          <FeatureTogglesPanel adminFeatures={adminFeatures} onToggleFeatures={onToggleFeatures} />
          <MailboxOversightPanel
            adminMailboxes={adminMailboxes}
            latestMailbox={adminLatestMailbox}
            mailboxesPage={adminMailboxesPage}
            mailboxesPageSize={adminMailboxesPageSize}
            mailboxesTotal={adminMailboxesTotal}
            onMailboxPageChange={onMailboxPageChange}
          />
        </div>
      </PageMain>
    </Page>
  );
}
