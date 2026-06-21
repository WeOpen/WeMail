import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, useLocation } from "react-router-dom";

import { AppLayout } from "./AppLayout";
import { AppRoutes } from "./AppRoutes";
import { AuthPage } from "../pages/AuthPage";
import { DesignSystemPage } from "../pages/DesignSystemPage";
import { acknowledgeAnnouncement, fetchAnnouncements, type AnnouncementItem } from "../features/announcements/api";
import { WemailLandingPage } from "../features/landing/WemailLandingPage";
import type { MailboxCreatePayload } from "../features/inbox/api";
import { Button } from "../shared/button";
import { OverlayDialog } from "../shared/overlay";
import { WemailLoadingShell } from "../shared/WemailLoadingShell";
import { WemailToastViewport } from "../shared/WemailToastViewport";
import { useAppStore } from "./appStore";
import { buildWorkspaceShellState } from "./workspaceShell";
import { useAppShell } from "./useAppShell";
import { useWorkspaceTheme } from "./useWorkspaceTheme";

function hasExplicitPostAuthPath(search: string) {
  return new URLSearchParams(search).has("next");
}

function resolvePostAuthPath(search: string, defaultPath = "/") {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/")) return defaultPath;
  if (next.startsWith("/login") || next.startsWith("/register")) return "/";
  return next;
}

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

function AppContent() {
  const location = useLocation();
  const { session, toasts, dismissToast, auth, inbox, settings, profile, admin } = useAppShell();
  const { theme, themePreference, setThemePreference, toggleTheme } = useWorkspaceTheme();
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
    if (location.pathname !== "/") {
      setMailboxComposerOpen(false);
    }
  }, [location.pathname, setMailboxComposerOpen]);

  useEffect(() => {
    if (!session) {
      setRecentAnnouncements([]);
      setIsAnnouncementDialogOpen(false);
      setSelectedMenuAnnouncement(null);
      return;
    }

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
  }, [session]);

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

  const shell = useMemo(() => {
    if (!session) return null;

    return buildWorkspaceShellState({
      pathname: location.pathname,
      session
    });
  }, [location.pathname, session]);

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

  const toastViewport = <WemailToastViewport onDismissToast={dismissToast} toasts={toasts} />;
  const isPublicDesignSystemPage = location.pathname === "/design-system";
  const isPublicHomePage = location.pathname === "/";

  if (isPublicDesignSystemPage) {
    return (
      <>
        {toastViewport}
        <DesignSystemPage
          consoleHref={profile.profile?.preferences.landingPage ?? "/dashboard"}
          isAuthenticated={Boolean(session)}
          onToggleTheme={toggleTheme}
          theme={theme}
        />
      </>
    );
  }

  if (auth.loadingSession) {
    return (
      <>
        {toastViewport}
        <WemailLoadingShell />
      </>
    );
  }

  if (!session) {
    return (
      <>
        {toastViewport}
        <AuthPage
          authError={auth.authError}
          onLogin={auth.handleLogin}
          onRegister={auth.handleRegister}
          onToggleTheme={toggleTheme}
          theme={theme}
        />
      </>
    );
  }

  if (location.pathname === "/login" || location.pathname === "/register") {
    if (!hasExplicitPostAuthPath(location.search) && !profile.hasLoadedProfile && !profile.profileError) {
      return (
        <>
          {toastViewport}
          <WemailLoadingShell />
        </>
      );
    }

    return <Navigate to={resolvePostAuthPath(location.search, profile.profile?.preferences.landingPage ?? "/dashboard")} replace />;
  }

  if (isPublicHomePage) {
    return (
      <>
        {toastViewport}
        <WemailLandingPage
          consoleHref={profile.profile?.preferences.landingPage ?? "/dashboard"}
          isAuthenticated
          onToggleTheme={toggleTheme}
          theme={theme}
        />
      </>
    );
  }

  if (!shell) return null;

  function dismissAnnouncementDialog() {
    const latestAnnouncement = recentAnnouncements[0];
    if (session && latestAnnouncement) {
      window.localStorage.setItem(getAnnouncementSeenKey(session.user.id, latestAnnouncement.id), "true");
      void acknowledgeRecentAnnouncement(latestAnnouncement).catch(() => undefined);
    }
    setIsAnnouncementDialogOpen(false);
  }

  return (
    <>
      {toastViewport}
      <AppLayout
        announcementCount={unsignedAnnouncementCount}
        announcements={recentAnnouncements.slice(0, 3)}
        session={session}
        onOpenAnnouncement={openMenuAnnouncement}
        onLogout={() => void auth.handleLogout()}
        onToggleTheme={toggleTheme}
        theme={theme}
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
          onLogout={() => void auth.handleLogout()}
          appearance={{
            theme,
            themePreference,
            setThemePreference
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

function AppShell() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export function App() {
  return <AppShell />;
}
