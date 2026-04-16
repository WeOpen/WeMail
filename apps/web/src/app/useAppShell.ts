import { useCallback, useEffect, useState } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAdminData } from "../features/admin/useAdminData";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";
import { useSettingsData } from "../features/settings/useSettingsData";
import { createToast, type WemailToastInput, type WemailToastRecord } from "../shared/toast";

export function useAppShell() {
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [toasts, setToasts] = useState<WemailToastRecord[]>([]);

  const handleSignedIn = useCallback((nextSession: SessionSummary) => {
    setSession(nextSession);
  }, []);

  const handleSignedOut = useCallback(() => {
    setSession(null);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((input: WemailToastInput) => {
    setToasts((currentToasts) => [createToast(input), ...currentToasts]);
  }, []);

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