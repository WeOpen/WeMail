import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  SessionSummary,
  UserProfileSummary,
  UserProfileUpdateInput,
  UserSessionSummary
} from "@wemail/shared";

import { AppLayout } from "./AppLayout";
import { AppRoutes } from "./AppRoutes";
import { acknowledgeAnnouncement, fetchAnnouncements, type AnnouncementItem } from "../features/announcements/api";
import { useAdminData } from "../features/admin/useAdminData";
import type { MailboxCreatePayload } from "../features/inbox/api";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";
import type { SettingsDataQueryOptions } from "../features/settings/queries";
import { useSettingsData } from "../features/settings/useSettingsData";
import { Button } from "../shared/button";
import { OverlayDialog } from "../shared/overlay";
import type { WemailToastInput } from "../shared/toast";
import { useAppStore } from "./appStore";
import { prefetchWorkspaceRoute } from "./workspaceRoutePrefetch";
import { buildWorkspaceShellState } from "./workspaceShell";
import type { WorkspaceTheme, WorkspaceThemePreference } from "./useWorkspaceTheme";

type WorkspaceProfileState = {
  profile: UserProfileSummary | null;
  profileSessions: UserSessionSummary[];
  hasLoadedProfile: boolean;
  isLoadingProfile: boolean;
  isSavingProfile: boolean;
  isSavingPreferences: boolean;
  isRevokingSession: boolean;
  profileError: string | null;
  refreshProfileData: () => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  saveProfile: (payload: UserProfileUpdateInput) => Promise<void>;
  savePreferences: (payload: UserProfileUpdateInput) => Promise<void>;
};

type WorkspaceAppProps = {
  session: SessionSummary;
  pathname: string;
  profile: WorkspaceProfileState;
  appearance: {
    theme: WorkspaceTheme;
    themePreference: WorkspaceThemePreference;
    setThemePreference: (preference: WorkspaceThemePreference) => void;
    onToggleTheme: () => void;
  };
  onLogout: () => void | Promise<void>;
  onToast: (toast: WemailToastInput) => void;
};

function getAnnouncementSeenKey(userId: string, announcementId: string) {
  return `wemail:announcements-seen:${userId}:${announcementId}`;
}

function isUnsignedAnnouncement(announcement: AnnouncementItem) {
  return announcement.receiptStatus !== "已签收";
}

function announcementTypeClassName(type: string) {
  switch (type) {
    case "维护通知":
      return "maintenance";
    case "产品更新":
      return "product";
    case "运营通知":
      return "operations";
    case "安全提醒":
      return "security";
    default:
      return "default";
  }
}

function announcementStatusClassName(status: string) {
  switch (status) {
    case "进行中":
      return "live";
    case "即将开始":
      return "soon";
    case "已结束":
      return "ended";
    case "已归档":
      return "archived";
    case "已发布":
      return "published";
    default:
      return "default";
  }
}

function announcementReceiptClassName(status: string | undefined) {
  return status === "已签收" ? "signed" : "unsigned";
}

function formatAnnouncementTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function isMailListPath(pathname: string) {
  return pathname === "/mail" || pathname === "/mail/list";
}

function isMailDataPath(pathname: string) {
  return isMailListPath(pathname) || pathname === "/mail/outbound" || pathname === "/mail/unassigned";
}

function getSettingsDataQuery(pathname: string, isAdmin: boolean): SettingsDataQueryOptions | null {
  if (pathname === "/settings" || pathname === "/api-keys") {
    return {
      includeApiKeys: true,
      includeDictionaries: false,
      includeRuntimeSettings: false,
      includeTelegram: false
    };
  }

  if (pathname === "/telegram") {
    return {
      includeApiKeys: false,
      includeDictionaries: false,
      includeRuntimeSettings: false,
      includeTelegram: true
    };
  }

  if (pathname === "/system/settings" && isAdmin) {
    return {
      includeApiKeys: false,
      includeDictionaries: false,
      includeRuntimeSettings: true,
      includeSystemDiagnostics: false,
      includeSystemMaturity: false,
      includeSystemOperations: false,
      includeSystemReliability: false,
      includeTelegram: false
    };
  }

  if (pathname === "/system/operations" && isAdmin) {
    return {
      includeApiKeys: false,
      includeDictionaries: false,
      includeRuntimeSettings: false,
      includeSystemDiagnostics: true,
      includeSystemMaturity: true,
      includeSystemOperations: true,
      includeSystemReliability: true,
      includeTelegram: false
    };
  }

  return null;
}

function shouldLoadAdminDashboard(pathname: string) {
  return pathname === "/admin" || pathname === "/users/settings";
}

export function WorkspaceApp({ appearance, onLogout, onToast, pathname, profile, session }: WorkspaceAppProps) {
  const shouldLoadMailData = isMailDataPath(pathname);
  const shouldLoadMailboxCreationOptions = isMailListPath(pathname);
  const inbox = useInboxWorkspace({
    enabled: shouldLoadMailData,
    loadMailboxCreationOptions: shouldLoadMailboxCreationOptions,
    loadSelectedMessageDetail: shouldLoadMailboxCreationOptions,
    onToast
  });
  const settings = useSettingsData({
    session,
    onToast
  });
  const admin = useAdminData({
    session,
    onToast
  });
  const { refreshMailboxes } = inbox;
  const { refreshSettingsData } = settings;
  const { refreshAdminData } = admin;
  const mailboxComposerOpen = useAppStore((state) => state.mailboxComposerOpen);
  const setMailboxComposerOpen = useAppStore((state) => state.setMailboxComposerOpen);
  const [recentAnnouncements, setRecentAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [selectedMenuAnnouncement, setSelectedMenuAnnouncement] = useState<AnnouncementItem | null>(null);

  const selectedMessage = useMemo(() => inbox.selectedMessage, [inbox.selectedMessage]);
  const unsignedAnnouncementCount = useMemo(
    () => recentAnnouncements.filter(isUnsignedAnnouncement).length,
    [recentAnnouncements]
  );

  useEffect(() => {
    if (pathname !== "/") {
      setMailboxComposerOpen(false);
    }
  }, [pathname, setMailboxComposerOpen]);

  useEffect(() => {
    if (!shouldLoadMailData) return;
    void refreshMailboxes();
  }, [refreshMailboxes, shouldLoadMailData]);

  useEffect(() => {
    const settingsDataQuery = getSettingsDataQuery(pathname, session.user.role === "admin");
    if (!settingsDataQuery) return;
    void refreshSettingsData(settingsDataQuery);
  }, [pathname, refreshSettingsData, session.user.role]);

  useEffect(() => {
    if (session.user.role !== "admin" || !shouldLoadAdminDashboard(pathname)) return;
    void refreshAdminData();
  }, [pathname, refreshAdminData, session.user.role]);

  useEffect(() => {
    let cancelled = false;
    void fetchAnnouncements({ page: 1, pageSize: 5 })
      .then((payload) => {
        if (cancelled) return;
        const nextAnnouncements = payload.announcements ?? [];
        setRecentAnnouncements(nextAnnouncements);

        const latestAnnouncement = nextAnnouncements[0];
        if (!latestAnnouncement) {
          setIsAnnouncementDialogOpen(false);
          return;
        }

        const seenKey = getAnnouncementSeenKey(session.user.id, latestAnnouncement.id);
        if (!window.localStorage.getItem(seenKey)) {
          setIsAnnouncementDialogOpen(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRecentAnnouncements([]);
        setIsAnnouncementDialogOpen(false);
        setSelectedMenuAnnouncement(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session.user.id]);

  const openMailboxComposer = useCallback(() => {
    setMailboxComposerOpen(true);
  }, [setMailboxComposerOpen]);

  const closeMailboxComposer = useCallback(() => {
    setMailboxComposerOpen(false);
  }, [setMailboxComposerOpen]);

  const handleCreateMailbox = useCallback(
    async (payload: MailboxCreatePayload) => {
      await inbox.createMailbox(payload);
      setMailboxComposerOpen(false);
    },
    [inbox, setMailboxComposerOpen]
  );

  const shell = useMemo(
    () =>
      buildWorkspaceShellState({
        pathname,
        session
      }),
    [pathname, session]
  );

  const replaceRecentAnnouncement = useCallback((updatedAnnouncement: AnnouncementItem) => {
    setRecentAnnouncements((currentAnnouncements) =>
      currentAnnouncements.map((announcement) =>
        announcement.id === updatedAnnouncement.id ? updatedAnnouncement : announcement
      )
    );
    setSelectedMenuAnnouncement((currentAnnouncement) =>
      currentAnnouncement?.id === updatedAnnouncement.id ? updatedAnnouncement : currentAnnouncement
    );
  }, []);

  const acknowledgeRecentAnnouncement = useCallback(
    async (announcement: AnnouncementItem) => {
      if (announcement.receiptStatus === "已签收") return;
      const payload = await acknowledgeAnnouncement(announcement.id);
      if (payload.announcement) {
        replaceRecentAnnouncement(payload.announcement);
      }
    },
    [replaceRecentAnnouncement]
  );

  const openMenuAnnouncement = useCallback(
    (announcement: AnnouncementItem) => {
      setSelectedMenuAnnouncement(announcement);
      void acknowledgeRecentAnnouncement(announcement).catch(() => undefined);
    },
    [acknowledgeRecentAnnouncement]
  );

  const closeMenuAnnouncement = useCallback(() => {
    setSelectedMenuAnnouncement(null);
  }, []);

  function dismissAnnouncementDialog() {
    const latestAnnouncement = recentAnnouncements[0];
    if (latestAnnouncement) {
      window.localStorage.setItem(getAnnouncementSeenKey(session.user.id, latestAnnouncement.id), "true");
      void acknowledgeRecentAnnouncement(latestAnnouncement).catch(() => undefined);
    }
    setIsAnnouncementDialogOpen(false);
  }

  return (
    <>
      <AppLayout
        announcementCount={unsignedAnnouncementCount}
        announcements={recentAnnouncements.slice(0, 3)}
        session={session}
        onOpenAnnouncement={openMenuAnnouncement}
        onLogout={() => void onLogout()}
        onPrefetchRoute={prefetchWorkspaceRoute}
        onToggleTheme={appearance.onToggleTheme}
        theme={appearance.theme}
        shell={shell}
        profilePreferences={profile.profile?.preferences ?? null}
      >
        <AppRoutes
          session={session}
          inbox={inbox}
          selectedMessage={selectedMessage}
          settings={settings}
          profile={profile}
          admin={admin}
          onLogout={() => void onLogout()}
          appearance={{
            theme: appearance.theme,
            themePreference: appearance.themePreference,
            setThemePreference: appearance.setThemePreference
          }}
          workspace={{
            mailboxComposerOpen,
            onOpenMailboxComposer: openMailboxComposer,
            onCloseMailboxComposer: closeMailboxComposer,
            onCreateMailbox: handleCreateMailbox
          }}
        />
      </AppLayout>
      {isAnnouncementDialogOpen && recentAnnouncements.length > 0 ? (
        <OverlayDialog
          closeLabel="关闭公告提醒"
          className="announcements-login-dialog"
          eyebrow="系统公告"
          onClose={dismissAnnouncementDialog}
          title="公告提醒"
        >
          <div className="announcements-login-dialog-body">
            {recentAnnouncements.slice(0, 3).map((announcement) => (
              <article className="announcements-login-item" key={announcement.id}>
                <span className={`announcements-chip ${announcement.pinned ? "published" : "neutral"}`}>
                  {announcement.pinned ? "置顶" : announcement.type}
                </span>
                <div>
                  <strong>{announcement.title}</strong>
                  <p className="section-copy">{announcement.summary}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="workspace-dialog-actions">
            <Button onClick={dismissAnnouncementDialog} variant="primary">
              我知道了
            </Button>
          </div>
        </OverlayDialog>
      ) : null}
      {selectedMenuAnnouncement ? (
        <OverlayDialog
          closeLabel="关闭公告详情"
          className="announcements-view-dialog announcements-menu-view-dialog"
          eyebrow="公告详情"
          onClose={closeMenuAnnouncement}
          title="公告详情"
        >
          <div className="announcements-view-body">
            <div className="announcements-chip-row">
              {selectedMenuAnnouncement.pinned ? <span className="announcements-chip pinned">已置顶</span> : null}
              <span className={`announcements-chip ${announcementTypeClassName(selectedMenuAnnouncement.type)}`}>
                {selectedMenuAnnouncement.type}
              </span>
              <span className={`announcements-chip ${announcementStatusClassName(selectedMenuAnnouncement.status)}`}>
                {selectedMenuAnnouncement.status}
              </span>
              <span className={`announcements-chip ${announcementReceiptClassName(selectedMenuAnnouncement.receiptStatus)}`}>
                {selectedMenuAnnouncement.receiptStatus ?? "未签收"}
              </span>
            </div>
            <div className="announcements-view-title">
              <h3>{selectedMenuAnnouncement.title}</h3>
              <p className="section-copy">{selectedMenuAnnouncement.summary}</p>
            </div>
            <dl className="announcements-view-meta">
              <div>
                <dt>发布者</dt>
                <dd>{selectedMenuAnnouncement.author}</dd>
              </div>
              <div>
                <dt>发布时间</dt>
                <dd>{formatAnnouncementTime(selectedMenuAnnouncement.publishedAt)}</dd>
              </div>
              <div>
                <dt>起始时间</dt>
                <dd>{formatAnnouncementTime(selectedMenuAnnouncement.startAt)}</dd>
              </div>
              <div>
                <dt>结束时间</dt>
                <dd>{formatAnnouncementTime(selectedMenuAnnouncement.endAt)}</dd>
              </div>
              <div>
                <dt>可见范围</dt>
                <dd>{selectedMenuAnnouncement.audience}</dd>
              </div>
              <div>
                <dt>优先级</dt>
                <dd>{selectedMenuAnnouncement.priority}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{selectedMenuAnnouncement.tags.length > 0 ? selectedMenuAnnouncement.tags.join(" / ") : "-"}</dd>
              </div>
            </dl>
            <div className="workspace-dialog-actions">
              <Button onClick={closeMenuAnnouncement} variant="primary">
                关闭
              </Button>
            </div>
          </div>
        </OverlayDialog>
      ) : null}
    </>
  );
}
