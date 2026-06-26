import { lazy, Suspense, useCallback, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, useLocation } from "react-router-dom";

import type { SessionSummary } from "@wemail/shared";

import { useAuthSession } from "../features/auth/useAuthSession";
import { useProfileData } from "../features/settings/useProfileData";
import { invalidateApiCache } from "../shared/api/client";
import { WemailLoadingShell } from "../shared/WemailLoadingShell";
import { WemailToastViewport } from "../shared/WemailToastViewport";
import { useAppStore } from "./appStore";
import { useWorkspaceTheme } from "./useWorkspaceTheme";

const AuthPage = lazy(() => import("../pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const DesignSystemPage = lazy(() => import("../pages/DesignSystemPage").then((module) => ({ default: module.DesignSystemPage })));
const WemailLandingPage = lazy(() => import("../features/landing/WemailLandingPage").then((module) => ({ default: module.WemailLandingPage })));
const WorkspaceApp = lazy(() => import("./WorkspaceApp").then((module) => ({ default: module.WorkspaceApp })));

function hasExplicitPostAuthPath(search: string) {
  return new URLSearchParams(search).has("next");
}

function resolvePostAuthPath(search: string, defaultPath = "/") {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/")) return defaultPath;
  if (next.startsWith("/login") || next.startsWith("/register")) return "/";
  return next;
}

function LazyPublicPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<WemailLoadingShell />}>{children}</Suspense>;
}

function AppContent() {
  const location = useLocation();
  const session = useAppStore((state) => state.session);
  const toasts = useAppStore((state) => state.toasts);
  const setSession = useAppStore((state) => state.setSession);
  const clearSession = useAppStore((state) => state.clearSession);
  const pushToast = useAppStore((state) => state.pushToast);
  const dismissToast = useAppStore((state) => state.dismissToast);
  const { theme, themePreference, setThemePreference, toggleTheme } = useWorkspaceTheme();

  const handleSignedIn = useCallback(
    (nextSession: SessionSummary) => {
      invalidateApiCache();
      setSession(nextSession);
    },
    [setSession]
  );

  const handleSignedOut = useCallback(() => {
    invalidateApiCache();
    clearSession();
  }, [clearSession]);

  const {
    authError,
    loadingSession,
    refreshSession,
    handleLogin,
    handleLogout,
    handleOAuthFinalize,
    handleRegister
  } = useAuthSession({
    onSignedIn: handleSignedIn,
    onSignedOut: handleSignedOut,
    onToast: pushToast
  });
  const profile = useProfileData({
    session,
    onSessionUpdated: setSession,
    onToast: pushToast
  });
  const { refreshProfileData } = profile;

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!session) return;
    void refreshProfileData();
  }, [refreshProfileData, session]);

  const toastViewport = <WemailToastViewport onDismissToast={dismissToast} toasts={toasts} />;
  const isPublicDesignSystemPage = location.pathname === "/design-system";
  const isPublicHomePage = location.pathname === "/";

  if (isPublicDesignSystemPage) {
    return (
      <>
        {toastViewport}
        <LazyPublicPage>
          <DesignSystemPage
            consoleHref={profile.profile?.preferences.landingPage ?? "/dashboard"}
            isAuthenticated={Boolean(session)}
            onToggleTheme={toggleTheme}
            theme={theme}
          />
        </LazyPublicPage>
      </>
    );
  }

  if (loadingSession) {
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
        <LazyPublicPage>
          <AuthPage
            authError={authError}
            onLogin={handleLogin}
            onOAuthFinalize={handleOAuthFinalize}
            onRegister={handleRegister}
            onToggleTheme={toggleTheme}
            theme={theme}
          />
        </LazyPublicPage>
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
        <LazyPublicPage>
          <WemailLandingPage
            consoleHref={profile.profile?.preferences.landingPage ?? "/dashboard"}
            isAuthenticated
            onToggleTheme={toggleTheme}
            theme={theme}
          />
        </LazyPublicPage>
      </>
    );
  }

  return (
    <>
      {toastViewport}
      <Suspense fallback={<WemailLoadingShell />}>
        <WorkspaceApp
          session={session}
          pathname={location.pathname}
          profile={profile}
          onLogout={handleLogout}
          onToast={pushToast}
          appearance={{
            theme,
            themePreference,
            setThemePreference,
            onToggleTheme: toggleTheme
          }}
        />
      </Suspense>
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
