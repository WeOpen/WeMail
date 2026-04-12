import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, useLocation } from "react-router-dom";

import { AppLayout } from "./AppLayout";
import { AppRoutes } from "./AppRoutes";
import { AuthPage } from "../pages/AuthPage";
import { buildWorkspaceShellState } from "./workspaceShell";
import { useAppShell } from "./useAppShell";
import { useWorkspaceTheme } from "./useWorkspaceTheme";

function AppContent() {
  const location = useLocation();
  const { session, notice, auth, inbox, settings, admin } = useAppShell();
  const { theme, toggleTheme } = useWorkspaceTheme();
  const [mailboxComposerOpen, setMailboxComposerOpen] = useState(false);

  const selectedMessage = useMemo(() => inbox.selectedMessage, [inbox.selectedMessage]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setMailboxComposerOpen(false);
    }
  }, [location.pathname]);

  const openMailboxComposer = useCallback(() => {
    setMailboxComposerOpen(true);
  }, []);

  const closeMailboxComposer = useCallback(() => {
    setMailboxComposerOpen(false);
  }, []);

  const handleCreateMailbox = useCallback(
    async (label: string) => {
      await inbox.createMailbox(label);
      setMailboxComposerOpen(false);
    },
    [inbox]
  );

  const shell = useMemo(() => {
    if (!session) return null;

    return buildWorkspaceShellState({
      pathname: location.pathname,
      session,
      inbox: {
        mailboxes: inbox.mailboxes,
        messages: inbox.messages,
        outboundHistory: inbox.outboundHistory,
        selectedMailboxId: inbox.selectedMailboxId
      },
      settings: {
        apiKeys: settings.apiKeys,
        telegram: settings.telegram
      },
      admin: {
        adminUsers: admin.adminUsers,
        adminInvites: admin.adminInvites,
        adminQuota: admin.adminQuota,
        adminMailboxes: admin.adminMailboxes
      },
      onOpenMailboxComposer: openMailboxComposer
    });
  }, [
    admin.adminInvites,
    admin.adminMailboxes,
    admin.adminQuota,
    admin.adminUsers,
    inbox.mailboxes,
    inbox.messages,
    inbox.outboundHistory,
    inbox.selectedMailboxId,
    location.pathname,
    openMailboxComposer,
    session,
    settings.apiKeys,
    settings.telegram
  ]);

  if (auth.loadingSession) {
    return (
      <div className="shell">
        <div className="panel shimmer">Loading wemail workspace…</div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage authError={auth.authError} onRegister={auth.handleRegister} onLogin={auth.handleLogin} />;
  }

  if (location.pathname === "/login" || location.pathname === "/register") {
    return <Navigate to="/" replace />;
  }

  if (!shell) return null;

  return (
    <AppLayout
      session={session}
      notice={notice}
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
        workspace={{
          mailboxComposerOpen,
          onOpenMailboxComposer: openMailboxComposer,
          onCloseMailboxComposer: closeMailboxComposer,
          onCreateMailbox: handleCreateMailbox
        }}
      />
    </AppLayout>
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
