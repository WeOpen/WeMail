import type { FormEvent } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

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
import { AccountsListPage } from "../features/accounts/AccountsListPage";
import { AccountsSettingsPage } from "../features/accounts/AccountsSettingsPage";
import { OutboundPage } from "../features/outbound/OutboundPage";
import { ApiKeysPage } from "../features/settings/ApiKeysPage";
import { MailSettingsPage } from "../features/settings/MailSettingsPage";
import { TelegramSettingsPage } from "../features/settings/TelegramSettingsPage";
import { WebhookPage } from "../features/settings/WebhookPage";
import { AnnouncementsPage } from "../pages/AnnouncementsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { InboxPage } from "../pages/InboxPage";
import { SystemSettingsPage } from "../pages/SystemSettingsPage";
import { SystemProfilePage } from "../pages/SystemProfilePage";
import { UsersGlobalSettingsPage } from "../pages/UsersGlobalSettingsPage";
import { UsersListRoutePage } from "../pages/UsersListRoutePage";
import { AboutPage } from "../pages/AboutPage";
import { WorkspacePlaceholderPage } from "../pages/WorkspacePlaceholderPage";
import type { WorkspaceTheme, WorkspaceThemePreference } from "./useWorkspaceTheme";

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
    createApiKey: (label: string) => Promise<{ key: { secret: string; prefix: string } }>;
    revokeApiKey: (keyId: string) => Promise<void>;
    saveTelegram: (payload: { chatId: string; enabled: boolean }) => Promise<void>;
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
  appearance: {
    theme: WorkspaceTheme;
    themePreference: WorkspaceThemePreference;
    setThemePreference: (preference: WorkspaceThemePreference) => void;
  };
  workspace: {
    mailboxComposerOpen: boolean;
    onOpenMailboxComposer: () => void;
    onCloseMailboxComposer: () => void;
    onCreateMailbox: (label: string) => Promise<void>;
  };
};

export function AppRoutes({ session, inbox, selectedMessage, settings, admin, appearance, workspace }: AppRoutesProps) {
  const inboxPage = (
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
  );

  const apiKeysPage = (
    <ApiKeysPage apiKeys={settings.apiKeys} onCreateApiKey={settings.createApiKey} onRevokeApiKey={settings.revokeApiKey} />
  );

  const telegramPage = (
    <TelegramSettingsPage telegram={settings.telegram} onSaveTelegram={settings.saveTelegram} />
  );

  const restrictedUsersPage = (
    <main className="workspace-grid restricted-grid">
      <section className="panel workspace-card restricted-card">
        <p className="panel-kicker">受限区域</p>
        <h2>当前账号无法访问用户管理</h2>
        <p className="section-copy">当前仍会显示统一工作台外壳，但只有管理员才能使用这里的用户控制能力。</p>
      </section>
    </main>
  );

  const usersListPage =
    session.user.role !== "admin" ? (
      restrictedUsersPage
    ) : (
      <UsersListRoutePage
        adminUsers={admin.adminUsers}
        adminQuota={admin.adminQuota}
        onSelectQuotaUser={admin.selectQuotaUser}
        onSubmitQuota={admin.submitQuota}
      />
    );

  const usersSettingsPage =
    session.user.role !== "admin" ? (
      restrictedUsersPage
    ) : (
      <UsersGlobalSettingsPage
        adminFeatures={admin.adminFeatures}
        adminInvites={admin.adminInvites}
        adminMailboxes={admin.adminMailboxes}
        adminQuota={admin.adminQuota}
        adminUsers={admin.adminUsers}
        onCreateInvite={admin.createInvite}
        onDisableInvite={admin.disableInvite}
        onSelectQuotaUser={admin.selectQuotaUser}
        onSubmitQuota={admin.submitQuota}
        onToggleFeatures={admin.toggleFeatures}
      />
    );

  const dashboardPage = <DashboardPage />;

  const accountsListPage = <AccountsListPage />;

  const accountsSettingsPage = <AccountsSettingsPage />;

  const mailOutboundPage = (
    <OutboundPage
      hasActiveMailbox={Boolean(inbox.selectedMailboxId)}
      onSendMail={inbox.sendMail}
      outboundHistory={inbox.outboundHistory}
    />
  );

  const mailSettingsPage = <MailSettingsPage />;

  const webhookPage = <WebhookPage />;

  const docsPage = (
    <WorkspacePlaceholderPage
      kicker="设置"
      title="文档页面已预留"
      description="文档入口已独立到左侧设置分组，后续可承接产品说明、API 文档与上手指南。"
      cards={[
        {
          title: "仪表盘",
          description: "回到仪表盘查看新导航结构总览。",
          actionLabel: "返回仪表盘",
          to: "/dashboard"
        },
        {
          title: "公告",
          description: "公告入口也已预留，后续可同步系统变更。",
          actionLabel: "打开公告",
          to: "/announcements"
        }
      ]}
    />
  );

  const announcementsPage = <AnnouncementsPage canPublish={session.user.role === "admin"} />;

  const systemSettingsPage = (
    <SystemSettingsPage
      resolvedTheme={appearance.theme}
      themePreference={appearance.themePreference}
      onSelectThemePreference={appearance.setThemePreference}
    />
  );

  const systemProfilePage = (
    <SystemProfilePage
      sessionSummary={{
        email: session.user.email,
        role: session.user.role === "admin" ? "管理员" : "成员",
        createdAtLabel: new Date(session.user.createdAt).toLocaleDateString("zh-CN")
      }}
    />
  );

  return (
    <Routes>
      <Route path="/" element={dashboardPage} />
      <Route path="/dashboard" element={dashboardPage} />
      <Route path="/accounts" element={accountsListPage} />
      <Route path="/accounts/list" element={accountsListPage} />
      <Route path="/accounts/settings" element={accountsSettingsPage} />
      <Route path="/mail" element={inboxPage} />
      <Route path="/mail/list" element={inboxPage} />
      <Route path="/mail/unassigned" element={<Navigate replace to={{ pathname: "/mail/outbound", search: "?view=exceptions" }} />} />
      <Route path="/mail/outbound" element={mailOutboundPage} />
      <Route path="/mail/settings" element={mailSettingsPage} />
      <Route path="/users" element={usersListPage} />
      <Route path="/users/list" element={usersListPage} />
      <Route path="/users/settings" element={usersSettingsPage} />
      <Route path="/admin" element={usersSettingsPage} />
      <Route path="/settings" element={apiKeysPage} />
      <Route path="/api-keys" element={apiKeysPage} />
      <Route path="/webhook" element={webhookPage} />
      <Route path="/telegram" element={telegramPage} />
      <Route path="/docs" element={docsPage} />
      <Route path="/announcements" element={announcementsPage} />
      <Route path="/system" element={<Navigate replace to="/system/settings" />} />
      <Route path="/system/settings" element={systemSettingsPage} />
      <Route path="/system/profile" element={systemProfilePage} />
      <Route path="/system/about" element={<AboutPage />} />
    </Routes>
  );
}
