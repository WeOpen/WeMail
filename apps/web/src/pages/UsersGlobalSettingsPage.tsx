import type { FormEvent } from "react";

import type { FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { FeatureTogglesPanel } from "../features/admin/FeatureTogglesPanel";
import { InvitePanel } from "../features/admin/InvitePanel";
import { MailboxOversightPanel } from "../features/admin/MailboxOversightPanel";
import { QuotaPanel } from "../features/admin/QuotaPanel";
import type { InviteSummary } from "../features/admin/types";

type UsersGlobalSettingsPageProps = {
  adminUsers: UserSummary[];
  adminInvites: InviteSummary[];
  adminQuota: QuotaSummary | null;
  adminFeatures: FeatureToggles | null;
  adminMailboxes: MailboxSummary[];
  onCreateInvite: () => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
  onToggleFeatures: (nextFeatureToggles: FeatureToggles) => Promise<void>;
};

export function UsersGlobalSettingsPage({
  adminUsers,
  adminInvites,
  adminQuota,
  adminFeatures,
  adminMailboxes,
  onCreateInvite,
  onDisableInvite,
  onSelectQuotaUser,
  onSubmitQuota,
  onToggleFeatures
}: UsersGlobalSettingsPageProps) {
  return (
    <main className="workspace-grid users-global-grid">
      <section className="panel workspace-card page-panel users-page-header">
        <div className="users-page-header-copy">
          <p className="panel-kicker">用户设置</p>
          <h2>全局控制</h2>
          <p className="section-copy">集中管理邀请码、系统级配额、全局功能开关和邮箱总览。</p>
        </div>
      </section>

      <div className="users-global-panels">
        <InvitePanel adminInvites={adminInvites} onCreateInvite={onCreateInvite} onDisableInvite={onDisableInvite} />
        <QuotaPanel
          adminUsers={adminUsers}
          adminQuota={adminQuota}
          onSelectQuotaUser={onSelectQuotaUser}
          onSubmitQuota={onSubmitQuota}
        />
        <FeatureTogglesPanel adminFeatures={adminFeatures} onToggleFeatures={onToggleFeatures} />
        <MailboxOversightPanel adminMailboxes={adminMailboxes} />
      </div>
    </main>
  );
}