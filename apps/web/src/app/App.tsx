import { useCallback, useEffect, useMemo } from "react";
import { BrowserRouter, Navigate, useLocation } from "react-router-dom";

import { AppLayout } from "./AppLayout";
import { AppRoutes } from "./AppRoutes";
import { AuthPage } from "../pages/AuthPage";
import { WemailLoadingShell } from "../shared/WemailLoadingShell";
import { WemailToastViewport } from "../shared/WemailToastViewport";
import { useAppStore } from "./appStore";
import { buildWorkspaceShellState } from "./workspaceShell";
import { useAppShell } from "./useAppShell";
import { useWorkspaceTheme } from "./useWorkspaceTheme";

function resolvePostAuthPath(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("/login") || next.startsWith("/register")) return "/";
  return next;
}

function AppContent() {
  const location = useLocation();
  const { session, toasts, dismissToast, auth, inbox, settings, admin } = useAppShell();
  const { theme, themePreference, setThemePreference, toggleTheme } = useWorkspaceTheme();
  const mailboxComposerOpen = useAppStore((state) => state.mailboxComposerOpen);
  const setMailboxComposerOpen = useAppStore((state) => state.setMailboxComposerOpen);

  const selectedMessage = useMemo(() => inbox.selectedMessage, [inbox.selectedMessage]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setMailboxComposerOpen(false);
    }
  }, [location.pathname, setMailboxComposerOpen]);

  const openMailboxComposer = useCallback(() => {
    setMailboxComposerOpen(true);
  }, [setMailboxComposerOpen]);

  const closeMailboxComposer = useCallback(() => {
    setMailboxComposerOpen(false);
  }, [setMailboxComposerOpen]);

  const handleCreateMailbox = useCallback(
    async (label: string) => {
      await inbox.createMailbox(label);
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

  const toastViewport = <WemailToastViewport onDismissToast={dismissToast} toasts={toasts} />;

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
    return <Navigate to={resolvePostAuthPath(location.search)} replace />;
  }

  if (!shell) return null;

  return (
    <>
      {toastViewport}
      <AppLayout
        session={session}
        onLogout={() => void auth.handleLogout()}
        onToggleTheme={toggleTheme}
        theme={theme}
        shell={shell}
      >
        <AppRoutes
          session={session}
          inbox={inbox}
        selectedMessage={selectedMessage}
        settings={settings}
        admin={admin}
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
