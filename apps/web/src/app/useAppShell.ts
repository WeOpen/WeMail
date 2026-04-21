import { useCallback, useEffect } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAdminData } from "../features/admin/useAdminData";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";
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
  const { selectedMailboxId, refreshMailboxes, refreshMessages, refreshOutbound } = inbox;

  const settings = useSettingsData({
    session,
    onToast: pushToast
  });
  const { refreshSettingsData } = settings;

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
    if (session.user.role === "admin") void refreshAdminData();
  }, [refreshAdminData, refreshMailboxes, refreshSettingsData, session]);

  useEffect(() => {
    if (!selectedMailboxId) return;
    void refreshMessages(selectedMailboxId);
    void refreshOutbound(selectedMailboxId);
  }, [refreshMessages, refreshOutbound, selectedMailboxId]);

  return {
    session,
    toasts,
    pushToast,
    dismissToast,
    auth,
    inbox,
    settings,
    admin
  };
}
