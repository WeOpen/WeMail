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
import { ApiKeysPanel } from "../features/settings/ApiKeysPanel";
import { TelegramPanel } from "../features/settings/TelegramPanel";
import { AdminPage } from "../pages/AdminPage";
import { DashboardPage } from "../pages/DashboardPage";
import { InboxPage } from "../pages/InboxPage";
import { WorkspacePlaceholderPage } from "../pages/WorkspacePlaceholderPage";

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
    <main className="workspace-grid settings-grid">
      <ApiKeysPanel apiKeys={settings.apiKeys} onCreateApiKey={settings.createApiKey} onRevokeApiKey={settings.revokeApiKey} />
    </main>
  );

  const telegramPage = (
    <main className="workspace-grid settings-grid">
      <TelegramPanel telegram={settings.telegram} onSaveTelegram={settings.saveTelegram} />
    </main>
  );

  const restrictedUsersPage = (
    <main className="workspace-grid restricted-grid">
      <section className="panel workspace-card restricted-card">
        <p className="panel-kicker">受限区域</p>
        <h2>当前账号无法访问用户管理</h2>
        <p className="section-copy">当前仍会展示统一工作台外壳，但只有管理员才能调整用户相关的控制能力。</p>
      </section>
    </main>
  );

  const usersListPage =
    session.user.role !== "admin" ? (
      restrictedUsersPage
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
    );

  const usersSettingsPage =
    session.user.role !== "admin" ? (
      restrictedUsersPage
    ) : (
      <WorkspacePlaceholderPage
        kicker="用户设置"
        title="用户设置先以占位页承接"
        description="左侧一级菜单与顶部二级菜单已经切换完成，后续可在这里接入角色策略、个人偏好和审计配置。"
        cards={[
          {
            title: "用户列表",
            description: `当前管理员可见 ${admin.adminUsers.length} 个账号，可继续从这里回到完整用户列表。`,
            actionLabel: "打开用户列表",
            to: "/users/list"
          },
          {
            title: "邀请码",
            description: `现有邀请码 ${admin.adminInvites.length} 个，后续可拆分到独立设置模块。`
          },
          {
            title: "邮箱总览",
            description: `当前系统追踪 ${admin.adminMailboxes.length} 个邮箱入口，后续可继续细分。`
          }
        ]}
        notePoints={["权限控制已保留", "二级菜单已切换到顶部", "后续可按模块逐步拆分真实功能"]}
      />
    );

  const dashboardPage = <DashboardPage />;

  const accountsListPage = (
    <WorkspacePlaceholderPage
      kicker="账号中心"
      title="账号列表先以占位页承接"
      description="已按图片结构预留账号列表入口，后续可把邮箱/账号实体映射到这里。"
      cards={[
        {
          title: "邮件列表",
          description: "现有邮箱列表与消息流仍在邮件列表页面可用。",
          actionLabel: "打开邮件列表",
          to: "/mail/list"
        },
        {
          title: "创建账号",
          description: "导航已预留创建账号入口，后续可接入独立表单或对话框。",
          actionLabel: "查看创建账号入口",
          to: "/accounts/create"
        },
        {
          title: "账号设置",
          description: "账号设置位已经预留，后续可拆出偏好与接入规则。",
          actionLabel: "打开账号设置",
          to: "/accounts/settings"
        }
      ]}
      notePoints={["当前先以占位为主", "后续可复用现有邮箱创建逻辑", "不会影响现有邮件能力"]}
    />
  );

  const accountsCreatePage = (
    <WorkspacePlaceholderPage
      kicker="账号中心"
      title="创建账号入口已挂到顶部二级菜单"
      description="先把信息架构与导航切换完成，后续可以把创建账号表单接到这里。"
      cards={[
        {
          title: "邮件列表",
          description: "当前邮箱创建能力仍保留在邮件列表页的创建邮箱对话框中。",
          actionLabel: "去邮件列表",
          to: "/mail/list"
        },
        {
          title: "账号列表",
          description: "返回账号列表占位页查看后续承接位置。",
          actionLabel: "打开账号列表",
          to: "/accounts/list"
        }
      ]}
      notePoints={["后续可把当前创建邮箱流程映射为账号创建", "保留为独立二级菜单入口"]}
    />
  );

  const accountsSettingsPage = (
    <WorkspacePlaceholderPage
      kicker="账号中心"
      title="账号设置先保留结构位置"
      description="账号设置已经移到账号栏目顶部的二级菜单，后续可在这里接入默认行为与接入规则。"
      cards={[
        {
          title: "账号列表",
          description: "回到账号列表查看预留入口。",
          actionLabel: "打开账号列表",
          to: "/accounts/list"
        },
        {
          title: "API 密钥",
          description: "接入类配置仍然在设置组的 API 密钥页面中维护。",
          actionLabel: "打开 API 密钥",
          to: "/api-keys"
        }
      ]}
    />
  );

  const mailUnassignedPage = (
    <WorkspacePlaceholderPage
      kicker="邮件中心"
      title="无收件人邮件页面已占位"
      description="顶部二级菜单已预留“无收件人邮件”入口，后续可以把异常邮件处理流接到这里。"
      cards={[
        {
          title: "邮件列表",
          description: "当前收件与外发功能仍在邮件列表页可用。",
          actionLabel: "返回邮件列表",
          to: "/mail/list"
        },
        {
          title: "发件箱",
          description: "二级菜单也已预留发件箱入口。",
          actionLabel: "打开发件箱占位",
          to: "/mail/outbound"
        }
      ]}
    />
  );

  const mailOutboundPage = (
    <WorkspacePlaceholderPage
      kicker="邮件中心"
      title="发件箱入口已占位"
      description="当前外发面板仍保留在邮件列表页，后续可把它抽离到独立发件箱页面。"
      cards={[
        {
          title: "邮件列表",
          description: "现有外发记录和发送表单仍在邮件列表页中。",
          actionLabel: "回到邮件列表",
          to: "/mail/list"
        },
        {
          title: "邮件设置",
          description: "如果后续要拆分更多邮件能力，可继续接到邮件设置页面。",
          actionLabel: "打开邮件设置",
          to: "/mail/settings"
        }
      ]}
    />
  );

  const mailSettingsPage = (
    <WorkspacePlaceholderPage
      kicker="邮件中心"
      title="邮件设置先做占位"
      description="邮件设置入口已经挂好，后续可在这里接通知、路由和默认行为配置。"
      cards={[
        {
          title: "Telegram",
          description: "通知能力暂时仍在 Telegram 页面维护。",
          actionLabel: "打开 Telegram",
          to: "/telegram"
        },
        {
          title: "Webhook",
          description: "事件回调能力已在左侧设置组中占位。",
          actionLabel: "打开 Webhook",
          to: "/webhook"
        }
      ]}
    />
  );

  const webhookPage = (
    <WorkspacePlaceholderPage
      kicker="设置"
      title="Webhook 页面先以占位承接"
      description="Webhook 已加入左侧设置分组，后续可以在这里接入签名、事件订阅和回调地址配置。"
      cards={[
        {
          title: "API 密钥",
          description: "当前自动化接入能力仍集中在 API 密钥页面。",
          actionLabel: "打开 API 密钥",
          to: "/api-keys"
        },
        {
          title: "文档",
          description: "文档入口也已挂载，可作为回调说明的后续落点。",
          actionLabel: "打开文档",
          to: "/docs"
        }
      ]}
    />
  );

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

  const announcementsPage = (
    <WorkspacePlaceholderPage
      kicker="设置"
      title="公告页面已预留"
      description="公告入口已挂到左侧设置分组，当前先占位，后续可接系统公告、版本更新与维护通知。"
      cards={[
        {
          title: "文档",
          description: "可与文档页联动承接发布说明。",
          actionLabel: "打开文档",
          to: "/docs"
        },
        {
          title: "仪表盘",
          description: "回到仪表盘查看整个后台的导航总览。",
          actionLabel: "返回仪表盘",
          to: "/dashboard"
        }
      ]}
    />
  );

  const systemAppearancePage = (
    <WorkspacePlaceholderPage
      kicker="系统设置"
      title="外观设置入口已预留"
      description="顶部二级菜单中的“外观设置”已生效；当前主题切换仍可直接使用右上角按钮，后续可把更多视觉偏好接到这里。"
      cards={[
        {
          title: "个人设置",
          description: "系统设置的另一项二级菜单也已接好。",
          actionLabel: "打开个人设置",
          to: "/system/profile"
        },
        {
          title: "Telegram",
          description: "通知配置仍在 Telegram 页面维护。",
          actionLabel: "打开 Telegram",
          to: "/telegram"
        }
      ]}
    />
  );

  const systemProfilePage = (
    <WorkspacePlaceholderPage
      kicker="系统设置"
      title="个人设置入口已预留"
      description="个人设置已移动到系统设置的顶部二级菜单，后续可在这里补充个人资料、偏好与安全项。"
      cards={[
        {
          title: "当前账号",
          description: `${session.user.email} · ${session.user.role === "admin" ? "管理员" : "成员"}`
        },
        {
          title: "外观设置",
          description: "返回外观设置占位页查看后续主题扩展位。",
          actionLabel: "打开外观设置",
          to: "/system/appearance"
        }
      ]}
    />
  );

  return (
    <Routes>
      <Route path="/" element={dashboardPage} />
      <Route path="/dashboard" element={dashboardPage} />
      <Route path="/accounts" element={accountsListPage} />
      <Route path="/accounts/list" element={accountsListPage} />
      <Route path="/accounts/create" element={accountsCreatePage} />
      <Route path="/accounts/settings" element={accountsSettingsPage} />
      <Route path="/mail" element={inboxPage} />
      <Route path="/mail/list" element={inboxPage} />
      <Route path="/mail/unassigned" element={mailUnassignedPage} />
      <Route path="/mail/outbound" element={mailOutboundPage} />
      <Route path="/mail/settings" element={mailSettingsPage} />
      <Route path="/users" element={usersListPage} />
      <Route path="/users/list" element={usersListPage} />
      <Route path="/users/settings" element={usersSettingsPage} />
      <Route path="/admin" element={usersListPage} />
      <Route path="/settings" element={apiKeysPage} />
      <Route path="/api-keys" element={apiKeysPage} />
      <Route path="/webhook" element={webhookPage} />
      <Route path="/telegram" element={telegramPage} />
      <Route path="/docs" element={docsPage} />
      <Route path="/announcements" element={announcementsPage} />
      <Route path="/system" element={systemAppearancePage} />
      <Route path="/system/appearance" element={systemAppearancePage} />
      <Route path="/system/profile" element={systemProfilePage} />
    </Routes>
  );
}
