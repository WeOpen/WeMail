import type { FormEvent } from "react";
import { Route, Routes } from "react-router-dom";

import type {
  ApiKeySummary,
  FeatureToggles,
  MailboxSummary,
  MessageSummary,
  QuotaSummary,
  SessionSummary,
  TelegramSubscriptionSummary,
  UserSummary
} from "@wemail/shared";

import type { InviteSummary } from "../features/admin/types";
import type { OutboundHistoryItem } from "../features/inbox/types";
import { AdminPage } from "../pages/AdminPage";
import { InboxPage } from "../pages/InboxPage";
import { SettingsPage } from "../pages/SettingsPage";

type AppRoutesProps = {
  session: SessionSummary;
  inbox: {
    mailboxes: MailboxSummary[];
    selectedMailboxId: string | null;
    messages: MessageSummary[];
    selectedMessageId: string | null;
    outboundHistory: OutboundHistoryItem[];
    setSelectedMailboxId: (mailboxId: string) => void;
    setSelectedMessageId: (messageId: string) => void;
    refreshMessages: (mailboxId?: string | null) => Promise<void>;
    createMailbox: (label: string) => Promise<void>;
    sendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  selectedMessage: MessageSummary | null;
  settings: {
    apiKeys: ApiKeySummary[];
    telegram: TelegramSubscriptionSummary | null;
    createApiKey: (label: string) => Promise<void>;
    revokeApiKey: (keyId: string) => Promise<void>;
    saveTelegram: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  admin: {
    adminUsers: UserSummary[];
    adminInvites: InviteSummary[];
    adminQuota: QuotaSummary | null;
    adminFeatures: FeatureToggles | null;
    adminMailboxes: MailboxSummary[];
    createInvite: () => Promise<void>;
    disableInvite: (inviteId: string) => Promise<void>;
    selectQuotaUser: (userId: string) => Promise<void>;
    submitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
    toggleFeatures: (nextFeatureToggles: FeatureToggles) => Promise<void>;
  };
  workspace: {
    mailboxComposerOpen: boolean;
    onOpenMailboxComposer: () => void;
    onCloseMailboxComposer: () => void;
    onCreateMailbox: (label: string) => Promise<void>;
  };
};

export function AppRoutes({ session, inbox, selectedMessage, settings, admin, workspace }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <InboxPage
            mailboxes={inbox.mailboxes}
            selectedMailboxId={inbox.selectedMailboxId}
            messages={inbox.messages}
            selectedMessageId={inbox.selectedMessageId}
            selectedMessage={selectedMessage}
            outboundHistory={inbox.outboundHistory}
            mailboxComposerOpen={workspace.mailboxComposerOpen}
            onCloseMailboxComposer={workspace.onCloseMailboxComposer}
            onCreateMailbox={workspace.onCreateMailbox}
            onOpenMailboxComposer={workspace.onOpenMailboxComposer}
            onSelectMailbox={inbox.setSelectedMailboxId}
            onSelectMessage={inbox.setSelectedMessageId}
            onRefreshMessages={() => void inbox.refreshMessages()}
            onSendMail={inbox.sendMail}
          />
        }
      />
      <Route
        path="/settings"
        element={
          <SettingsPage
            apiKeys={settings.apiKeys}
            telegram={settings.telegram}
            onCreateApiKey={settings.createApiKey}
            onRevokeApiKey={settings.revokeApiKey}
            onSaveTelegram={settings.saveTelegram}
          />
        }
      />
      <Route
        path="/admin"
        element={
          session.user.role !== "admin" ? (
            <main className="workspace-grid restricted-grid">
              <section className="panel workspace-card restricted-card">
                <p className="panel-kicker">Restricted</p>
                <h2>Admin controls are locked</h2>
                <p className="section-copy">
                  This route keeps the control shell visible, but only administrative operators can adjust invites,
                  quotas, feature switches, or mailbox oversight.
                </p>
              </section>
            </main>
          ) : (
            <AdminPage
              adminUsers={admin.adminUsers}
              adminInvites={admin.adminInvites}
              adminQuota={admin.adminQuota}
              adminFeatures={admin.adminFeatures}
              adminMailboxes={admin.adminMailboxes}
              onCreateInvite={admin.createInvite}
              onDisableInvite={admin.disableInvite}
              onSelectQuotaUser={admin.selectQuotaUser}
              onSubmitQuota={admin.submitQuota}
              onToggleFeatures={admin.toggleFeatures}
            />
          )
        }
      />
    </Routes>
  );
}
