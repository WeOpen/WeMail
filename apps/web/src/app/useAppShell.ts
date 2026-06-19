import { useCallback, useEffect } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAdminData } from "../features/admin/useAdminData";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";
import { useProfileData } from "../features/settings/useProfileData";
import { useSettingsData } from "../features/settings/useSettingsData";
import { useAppStore } from "./appStore";

export function useAppShell() {
  const session = useAppStore((state) => state.session);
  const toasts = useAppStore((state) => state.toasts);
  const setSession = useAppStore((state) => state.setSession);
  const clearSession = useAppStore((state) => state.clearSession);
  const pushToast = useAppStore((state) => state.pushToast);
  const dismissToast = useAppStore((state) => state.dismissToast);

  const handleSignedIn = useCallback((nextSession: SessionSummary) => {
    setSession(nextSession);
  }, [setSession]);

  const handleSignedOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const auth = useAuthSession({
    onSignedIn: handleSignedIn,
    onSignedOut: handleSignedOut,
    onToast: pushToast
  });
  const { refreshSession } = auth;

  const inbox = useInboxWorkspace({
    enabled: Boolean(session),
    onToast: pushToast
  });
  const { mailboxes, selectedMailboxId, refreshMailboxes, refreshOutbound } = inbox;

  const settings = useSettingsData({
    session,
    onToast: pushToast
  });
  const { refreshSettingsData } = settings;

  const profile = useProfileData({
    session,
    onSessionUpdated: setSession,
    onToast: pushToast
  });
  const { refreshProfileData } = profile;

  const admin = useAdminData({
    session,
    onToast: pushToast
  });
  const { refreshAdminData } = admin;

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!session) return;
    void refreshMailboxes();
    void refreshSettingsData();
    void refreshProfileData();
    if (session.user.role === "admin") void refreshAdminData();
  }, [refreshAdminData, refreshMailboxes, refreshProfileData, refreshSettingsData, session]);

  useEffect(() => {
    if (!session) return;
    const outboundMailboxId = selectedMailboxId ?? mailboxes[0]?.id ?? null;
    void refreshOutbound(outboundMailboxId);
  }, [mailboxes, refreshOutbound, selectedMailboxId, session]);

  return {
    session,
    toasts,
    pushToast,
    dismissToast,
    auth,
    inbox,
    settings,
    profile,
    admin
  };
}
