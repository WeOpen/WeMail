import { useCallback, useEffect, useState } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAdminData } from "../features/admin/useAdminData";
import { useAuthSession } from "../features/auth/useAuthSession";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";
import { useSettingsData } from "../features/settings/useSettingsData";

export function useAppShell() {
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSignedIn = useCallback((nextSession: SessionSummary) => {
    setSession(nextSession);
  }, []);

  const handleSignedOut = useCallback(() => {
    setSession(null);
  }, []);

  const handleNotice = useCallback((message: string | null) => {
    setNotice(message);
  }, []);

  const auth = useAuthSession({
    onSignedIn: handleSignedIn,
    onSignedOut: handleSignedOut,
    onNotice: handleNotice
  });
  const { refreshSession } = auth;

  const inbox = useInboxWorkspace({
    enabled: Boolean(session),
    onNotice: setNotice
  });
  const {
    selectedMailboxId,
    refreshMailboxes,
    refreshMessages,
    refreshOutbound
  } = inbox;

  const settings = useSettingsData({
    session,
    onNotice: setNotice
  });
  const { refreshSettingsData } = settings;

  const admin = useAdminData({
    session,
    onNotice: setNotice
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
    notice,
    auth,
    inbox,
    settings,
    admin
  };
}
