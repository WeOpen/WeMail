import type { FormEvent } from "react";

import type { FeatureToggles, MailboxSummary, QuotaSummary, UserSummary } from "@wemail/shared";

import { FeatureTogglesPanel } from "../features/admin/FeatureTogglesPanel";
import { InvitePanel } from "../features/admin/InvitePanel";
import { MailboxOversightPanel } from "../features/admin/MailboxOversightPanel";
import { QuotaPanel } from "../features/admin/QuotaPanel";
import type { InviteSummary } from "../features/admin/types";

type AdminPageProps = {
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

export function AdminPage({
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
}: AdminPageProps) {
  return (
    <main className="workspace-grid admin-grid">
      <InvitePanel adminInvites={adminInvites} onCreateInvite={onCreateInvite} onDisableInvite={onDisableInvite} />
      <QuotaPanel
        adminUsers={adminUsers}
        adminQuota={adminQuota}
        onSelectQuotaUser={onSelectQuotaUser}
        onSubmitQuota={onSubmitQuota}
      />
      <FeatureTogglesPanel adminFeatures={adminFeatures} onToggleFeatures={onToggleFeatures} />
      <MailboxOversightPanel adminMailboxes={adminMailboxes} />
    </main>
  );
}
