import { lazy, Suspense, type FormEvent, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import type {
  ApiKeySummary,
  FeatureToggles,
  MailDomainSummary,
  MailboxSummary,
  MessageListSummary,
  MessageSummary,
  QuotaSummary,
  RuntimeSettings,
  RuntimeSettingsUpdateInput,
  SessionSummary,
  TelegramDeliverySummary,
  TelegramLinkCodeSummary,
  TelegramOverviewSummary,
  TelegramTestMessageResult,
  UserProfileSummary,
  UserProfileUpdateInput,
  UserRole,
  UserStatus,
  UserSummary
} from "@wemail/shared";

import type { AdminUserStats, AdminUsersQuery, InviteSummary } from "../features/admin/types";
import type {
  MailboxCreatePayload,
  MailboxListQueryInput,
  MailboxListResponse,
  MessageListQueryInput,
  OutboundListQueryInput
} from "../features/inbox/api";
import type { OutboundHistoryDetail, OutboundHistoryItem, OutboundHistorySummary } from "../features/inbox/types";
import { Button } from "../shared/button";
import type { WorkspaceTheme, WorkspaceThemePreference } from "./useWorkspaceTheme";

const AboutPage = lazy(() => import("../pages/AboutPage").then((module) => ({ default: module.AboutPage })));
const AccountsListRoutePage = lazy(() => import("../features/accounts/AccountsListRoutePage").then((module) => ({ default: module.AccountsListRoutePage })));
const AccountsSettingsPage = lazy(() => import("../features/accounts/AccountsSettingsPage").then((module) => ({ default: module.AccountsSettingsPage })));
const AnnouncementsPage = lazy(() => import("../pages/AnnouncementsPage").then((module) => ({ default: module.AnnouncementsPage })));
const ApiInterfacesPage = lazy(() => import("../features/settings/ApiInterfacesPage").then((module) => ({ default: module.ApiInterfacesPage })));
const ApiKeysPage = lazy(() => import("../features/settings/ApiKeysPage").then((module) => ({ default: module.ApiKeysPage })));
const DashboardPage = lazy(() => import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const InboxPage = lazy(() => import("../pages/InboxPage").then((module) => ({ default: module.InboxPage })));
const MailSettingsPage = lazy(() => import("../features/settings/MailSettingsPage").then((module) => ({ default: module.MailSettingsPage })));
const OutboundPage = lazy(() => import("../features/outbound/OutboundPage").then((module) => ({ default: module.OutboundPage })));
const SystemProfilePage = lazy(() => import("../pages/SystemProfilePage").then((module) => ({ default: module.SystemProfilePage })));
const SystemSettingsPage = lazy(() => import("../pages/SystemSettingsPage").then((module) => ({ default: module.SystemSettingsPage })));
const TelegramSettingsPage = lazy(() => import("../features/settings/TelegramSettingsPage").then((module) => ({ default: module.TelegramSettingsPage })));
const UsersGlobalSettingsPage = lazy(() => import("../pages/UsersGlobalSettingsPage").then((module) => ({ default: module.UsersGlobalSettingsPage })));
const UsersListRoutePage = lazy(() => import("../pages/UsersListRoutePage").then((module) => ({ default: module.UsersListRoutePage })));
const WebhookPage = lazy(() => import("../features/settings/WebhookPage").then((module) => ({ default: module.WebhookPage })));
const WorkspacePlaceholderPage = lazy(() => import("../pages/WorkspacePlaceholderPage").then((module) => ({ default: module.WorkspacePlaceholderPage })));

type AppRoutesProps = {
  session: SessionSummary;
  inbox: {
    mailboxes: MailboxSummary[];
    selectedMailboxId: string | null;
    messages: MessageSummary[];
    isLoadingMessages: boolean;
    messageListError: string | null;
    messageListPage: number;
    messageListPageSize: number;
    messageListSummary: MessageListSummary;
    messageListTotal: number;
    selectedMessageId: string | null;
    isLoadingSelectedMessage: boolean;
    selectedMessageError: string | null;
    outboundHistory: OutboundHistoryItem[];
    outboundTotal: number;
    outboundPage: number;
    outboundPageSize: number;
    outboundSummary: OutboundHistorySummary;
    isLoadingOutbound: boolean;
    outboundError: string | null;
    availableMailboxDomains: MailDomainSummary[];
    isLoadingMailboxDomains: boolean;
    requireMailboxCreatorNote: boolean;
    setSelectedMailboxId: (mailboxId: string | null) => void;
    setSelectedMessageId: (messageId: string) => void;
    refreshMailboxOptions: (query: MailboxListQueryInput) => Promise<Required<MailboxListResponse>>;
    refreshMessages: (query?: MessageListQueryInput | string | null) => Promise<void>;
    refreshSelectedMessage: (messageId?: string | null) => Promise<void>;
    refreshOutbound: (query?: string | OutboundListQueryInput | null) => Promise<void>;
    loadOutboundDetail: (messageId: string) => Promise<OutboundHistoryDetail>;
    createMailbox: (payload: MailboxCreatePayload) => Promise<void>;
    sendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  selectedMessage: MessageSummary | null;
  settings: {
    apiKeys: ApiKeySummary[];
    runtimeSettings: RuntimeSettings | null;
    telegramOverview: TelegramOverviewSummary;
    telegramDeliveries: TelegramDeliverySummary[];
    createApiKey: (label: string) => Promise<{ key: { secret: string; prefix: string } }>;
    revokeApiKey: (keyId: string) => Promise<void>;
    saveTelegram: (payload: { chatId: string; enabled: boolean }) => Promise<void>;
    createTelegramLinkCode: () => Promise<TelegramLinkCodeSummary>;
    refreshSettingsData: () => Promise<void>;
    saveRuntimeSettings: (payload: RuntimeSettingsUpdateInput) => Promise<void>;
    sendTelegramTest: () => Promise<TelegramTestMessageResult>;
  };
  profile: {
    profile: UserProfileSummary | null;
    hasLoadedProfile: boolean;
    isLoadingProfile: boolean;
    isSavingProfile: boolean;
    isSavingPreferences: boolean;
    profileError: string | null;
    refreshProfileData: () => Promise<void>;
    saveProfile: (payload: UserProfileUpdateInput) => Promise<void>;
    savePreferences: (payload: UserProfileUpdateInput) => Promise<void>;
  };
  admin: {
    adminUsers: UserSummary[];
    adminUsersTotal: number;
    adminSettingsUsers: UserSummary[];
    adminUserStats: AdminUserStats;
    adminInvites: InviteSummary[];
    adminInvitesAvailable: number;
    adminInvitesPage: number;
    adminInvitesPageSize: number;
    adminInvitesTotal: number;
    adminQuota: QuotaSummary | null;
    adminFeatures: FeatureToggles | null;
    adminMailboxes: MailboxSummary[];
    adminLatestMailbox: MailboxSummary | null;
    adminMailboxesPage: number;
    adminMailboxesPageSize: number;
    adminMailboxesTotal: number;
    createUser: (payload: { email: string; name: string; password: string; role: UserRole }) => Promise<void>;
    changeUserRoles: (userIds: string[], role: UserRole) => Promise<void>;
    updateUser: (userId: string, payload: { name: string }) => Promise<void>;
    resetUserPassword: (userId: string, password: string) => Promise<void>;
    updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    refreshAdminUsers: (query: AdminUsersQuery) => Promise<void>;
    isLoadingUsers: boolean;
    usersError: string | null;
    suspendUsersOutbound: (userIds: string[]) => Promise<void>;
    createInvite: () => Promise<void>;
    disableInvite: (inviteId: string) => Promise<void>;
    refreshAdminInvites: (query: { page: number; pageSize: number }) => Promise<void>;
    refreshAdminMailboxes: (query: { page: number; pageSize: number }) => Promise<void>;
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
    onCreateMailbox: (payload: MailboxCreatePayload) => Promise<void>;
  };
  onLogout: () => void;
};

function WorkspaceRouteFallback() {
  return (
    <main className="workspace-grid">
      <section className="panel workspace-card page-panel">
        <p className="panel-kicker">页面加载</p>
        <h2>正在打开工作台页面</h2>
      </section>
    </main>
  );
}

function LazyWorkspaceRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<WorkspaceRouteFallback />}>{children}</Suspense>;
}

function lazyRoute(element: ReactNode) {
  return <LazyWorkspaceRoute>{element}</LazyWorkspaceRoute>;
}

export function AppRoutes({
  session,
  inbox,
  selectedMessage,
  settings,
  profile,
  admin,
  appearance,
  workspace,
  onLogout
}: AppRoutesProps) {
  const inboxPage = (
    <InboxPage
      mailboxes={inbox.mailboxes}
      currentUserRole={session.user.role}
      selectedMailboxId={inbox.selectedMailboxId}
      messages={inbox.messages}
      isLoadingMessages={inbox.isLoadingMessages}
      messageListError={inbox.messageListError}
      messageListPage={inbox.messageListPage}
      messageListPageSize={inbox.messageListPageSize}
      messageListSummary={inbox.messageListSummary}
      messageListTotal={inbox.messageListTotal}
      selectedMessageId={inbox.selectedMessageId}
      selectedMessage={selectedMessage}
      isLoadingSelectedMessage={inbox.isLoadingSelectedMessage}
      selectedMessageError={inbox.selectedMessageError}
      outboundHistory={inbox.outboundHistory}
      availableDomains={inbox.availableMailboxDomains}
      isLoadingDomains={inbox.isLoadingMailboxDomains}
      mailboxComposerOpen={workspace.mailboxComposerOpen}
      onCloseMailboxComposer={workspace.onCloseMailboxComposer}
      onCreateMailbox={workspace.onCreateMailbox}
      onOpenMailboxComposer={workspace.onOpenMailboxComposer}
      onQueryMailboxes={inbox.refreshMailboxOptions}
      onSelectMailbox={inbox.setSelectedMailboxId}
      onSelectMessage={inbox.setSelectedMessageId}
      onRefreshMessages={inbox.refreshMessages}
      onRetrySelectedMessage={inbox.refreshSelectedMessage}
      onSendMail={inbox.sendMail}
      requireCreatorNote={inbox.requireMailboxCreatorNote}
    />
  );

  const apiKeysPage = (
    <ApiKeysPage apiKeys={settings.apiKeys} onCreateApiKey={settings.createApiKey} onRevokeApiKey={settings.revokeApiKey} />
  );
  const apiInterfacesPage = <ApiInterfacesPage />;

  const telegramPage = (
    <TelegramSettingsPage
      deliveries={settings.telegramDeliveries}
      overview={settings.telegramOverview}
      onCreateTelegramLinkCode={settings.createTelegramLinkCode}
      onRefreshTelegram={settings.refreshSettingsData}
      onSaveTelegram={settings.saveTelegram}
      onSendTelegramTest={settings.sendTelegramTest}
    />
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
        adminUsersTotal={admin.adminUsersTotal}
        adminQuota={admin.adminQuota}
        currentUserId={session.user.id}
        isLoadingUsers={admin.isLoadingUsers}
        onBulkChangeRole={admin.changeUserRoles}
        onBulkSuspendOutbound={admin.suspendUsersOutbound}
        onCreateUser={admin.createUser}
        onDeleteUser={admin.deleteUser}
        onRefreshUsers={admin.refreshAdminUsers}
        onResetUserPassword={admin.resetUserPassword}
        onSelectQuotaUser={admin.selectQuotaUser}
        onSubmitQuota={admin.submitQuota}
        onUpdateUser={admin.updateUser}
        onUpdateUserStatus={admin.updateUserStatus}
        usersError={admin.usersError}
      />
    );

  const usersSettingsPage =
    session.user.role !== "admin" ? (
      restrictedUsersPage
    ) : (
      <UsersGlobalSettingsPage
        adminFeatures={admin.adminFeatures}
        adminInvites={admin.adminInvites}
        adminInvitesAvailable={admin.adminInvitesAvailable}
        adminInvitesPage={admin.adminInvitesPage}
        adminInvitesPageSize={admin.adminInvitesPageSize}
        adminInvitesTotal={admin.adminInvitesTotal}
        adminLatestMailbox={admin.adminLatestMailbox}
        adminMailboxes={admin.adminMailboxes}
        adminMailboxesPage={admin.adminMailboxesPage}
        adminMailboxesPageSize={admin.adminMailboxesPageSize}
        adminMailboxesTotal={admin.adminMailboxesTotal}
        adminQuota={admin.adminQuota}
        adminSettingsUsers={admin.adminSettingsUsers}
        adminUserStats={admin.adminUserStats}
        adminUsers={admin.adminUsers}
        onCreateInvite={admin.createInvite}
        onDisableInvite={admin.disableInvite}
        onInvitePageChange={(page) => admin.refreshAdminInvites({ page, pageSize: admin.adminInvitesPageSize })}
        onMailboxPageChange={(page) => admin.refreshAdminMailboxes({ page, pageSize: admin.adminMailboxesPageSize })}
        onSelectQuotaUser={admin.selectQuotaUser}
        onSubmitQuota={admin.submitQuota}
        onToggleFeatures={admin.toggleFeatures}
      />
    );

  const dashboardPage = <DashboardPage canViewRoleCard={session.user.role === "admin"} />;
  const preferredLandingPage = profile.profile?.preferences.landingPage ?? "/dashboard";
  const rootPage = profile.profile ? <Navigate replace to={preferredLandingPage} /> : dashboardPage;

  const accountsListPage = <AccountsListRoutePage currentUserRole={session.user.role} />;

  const accountsSettingsPage = <AccountsSettingsPage />;

  const activeOutboundMailbox =
    inbox.mailboxes.find((mailbox) => mailbox.id === inbox.selectedMailboxId) ?? inbox.mailboxes[0] ?? null;

  const mailOutboundPage = (
    <OutboundPage
      activeMailbox={activeOutboundMailbox}
      mailboxes={inbox.mailboxes}
      onRefreshOutbound={inbox.refreshOutbound}
      onLoadOutboundDetail={inbox.loadOutboundDetail}
      onSelectMailbox={inbox.setSelectedMailboxId}
      onSendMail={inbox.sendMail}
      outboundHistory={inbox.outboundHistory}
      outboundTotal={inbox.outboundTotal}
      outboundPage={inbox.outboundPage}
      outboundPageSize={inbox.outboundPageSize}
      outboundSummary={inbox.outboundSummary}
      isLoadingOutbound={inbox.isLoadingOutbound}
      outboundError={inbox.outboundError}
      selectedMailboxId={inbox.selectedMailboxId}
    />
  );

  const mailSettingsPage = <MailSettingsPage canManageMailSettings={session.user.role === "admin"} />;

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
      canManageDomains
      canManageRuntimeSettings={session.user.role === "admin"}
      runtimeSettings={settings.runtimeSettings}
      resolvedTheme={appearance.theme}
      themePreference={appearance.themePreference}
      onSelectThemePreference={appearance.setThemePreference}
      onSaveRuntimeSettings={settings.saveRuntimeSettings}
    />
  );

  const systemProfilePage = profile.profile ? (
    <SystemProfilePage
      isSavingPreferences={profile.isSavingPreferences}
      isSavingProfile={profile.isSavingProfile}
      profile={profile.profile}
      onLogoutCurrentDevice={onLogout}
      onSavePreferences={profile.savePreferences}
      onSaveProfile={profile.saveProfile}
    />
  ) : (
    <main className="workspace-grid profile-settings-grid">
      <section className="panel workspace-card page-panel profile-settings-panel">
        <p className="panel-kicker">账号资料</p>
        <h2>{profile.isLoadingProfile ? "正在同步个人设置" : profile.profileError ? "个人设置同步失败" : "个人设置暂不可用"}</h2>
        {profile.profileError ? (
          <>
            <p aria-label="个人设置加载失败" className="error-banner" role="alert">
              {profile.profileError}
            </p>
            <div className="profile-settings-actions">
              <Button
                isLoading={profile.isLoadingProfile}
                loadingLabel="同步中"
                onClick={() => void profile.refreshProfileData()}
                variant="primary"
              >
                重试同步
              </Button>
            </div>
          </>
        ) : (
          <p className="section-copy">当前会话：{session.user.email}</p>
        )}
      </section>
    </main>
  );

  return (
    <Routes>
      <Route path="/" element={lazyRoute(rootPage)} />
      <Route path="/dashboard" element={lazyRoute(dashboardPage)} />
      <Route path="/accounts" element={lazyRoute(accountsListPage)} />
      <Route path="/accounts/list" element={lazyRoute(accountsListPage)} />
      <Route path="/accounts/settings" element={lazyRoute(accountsSettingsPage)} />
      <Route path="/mail" element={lazyRoute(inboxPage)} />
      <Route path="/mail/list" element={lazyRoute(inboxPage)} />
      <Route path="/mail/unassigned" element={<Navigate replace to={{ pathname: "/mail/outbound", search: "?view=failed" }} />} />
      <Route path="/mail/outbound" element={lazyRoute(mailOutboundPage)} />
      <Route path="/mail/settings" element={lazyRoute(mailSettingsPage)} />
      <Route path="/users" element={lazyRoute(usersListPage)} />
      <Route path="/users/list" element={lazyRoute(usersListPage)} />
      <Route path="/users/settings" element={lazyRoute(usersSettingsPage)} />
      <Route path="/admin" element={lazyRoute(usersSettingsPage)} />
      <Route path="/settings" element={lazyRoute(apiKeysPage)} />
      <Route path="/api-keys" element={lazyRoute(apiKeysPage)} />
      <Route path="/api-keys/interfaces" element={lazyRoute(apiInterfacesPage)} />
      <Route path="/webhook" element={lazyRoute(webhookPage)} />
      <Route path="/telegram" element={lazyRoute(telegramPage)} />
      <Route path="/docs" element={lazyRoute(docsPage)} />
      <Route path="/announcements" element={lazyRoute(announcementsPage)} />
      <Route path="/system" element={<Navigate replace to="/system/settings" />} />
      <Route path="/system/settings" element={lazyRoute(systemSettingsPage)} />
      <Route path="/system/profile" element={lazyRoute(systemProfilePage)} />
      <Route path="/system/about" element={lazyRoute(<AboutPage />)} />
    </Routes>
  );
}
