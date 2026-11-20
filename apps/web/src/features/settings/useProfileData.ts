import { useCallback, useEffect, useRef, useState } from "react";

import type { SessionSummary, UserProfileSummary, UserProfileUpdateInput, UserSessionSummary } from "@wemail/shared";

import type { WemailToastInput } from "../../shared/toast";
import {
  fetchProfileSessions,
  fetchUserProfile,
  revokeOtherProfileSessions,
  revokeProfileSession,
  updateUserProfile
} from "./api";

type UseProfileDataOptions = {
  session: SessionSummary | null;
  onSessionUpdated: (session: SessionSummary) => void;
  onToast: (toast: WemailToastInput) => void;
};

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "请求失败，请稍后重试。";
}

export function useProfileData({ session, onSessionUpdated, onToast }: UseProfileDataOptions) {
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isRevokingSession, setIsRevokingSession] = useState(false);
  const [profileSessions, setProfileSessions] = useState<UserSessionSummary[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const sessionUserId = session?.user.id ?? null;
  const currentSessionUserIdRef = useRef(sessionUserId);
  currentSessionUserIdRef.current = sessionUserId;
  const requestVersionRef = useRef(0);
  const pendingUpdateRef = useRef<{ userId: string | null } | null>(null);

  useEffect(() => {
    requestVersionRef.current += 1;
    setProfile(null);
    setProfileSessions([]);
    setProfileError(null);
    setHasLoadedProfile(false);
    setIsLoadingProfile(false);
    setIsSavingProfile(false);
    setIsSavingPreferences(false);
  }, [sessionUserId]);

  const refreshProfileData = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    if (!sessionUserId) {
      setProfile(null);
      setProfileSessions([]);
      setProfileError(null);
      setHasLoadedProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);
    const canApplyResult = () => requestVersionRef.current === requestVersion
      && currentSessionUserIdRef.current === sessionUserId && pendingUpdateRef.current?.userId !== sessionUserId;
    try {
      const [profilePayload, sessionsPayload] = await Promise.all([fetchUserProfile(), fetchProfileSessions()]);
      if (!canApplyResult()) return;
      setProfile(profilePayload.profile ?? null);
      setProfileSessions(sessionsPayload.sessions ?? []);
    } catch (error) {
      if (!canApplyResult()) return;
      const message = readErrorMessage(error);
      setProfile(null);
      setProfileSessions([]);
      setProfileError(message);
      onToast({ message: `个人设置同步失败：${message}`, tone: "error" });
    } finally {
      if (requestVersionRef.current === requestVersion && currentSessionUserIdRef.current === sessionUserId) {
        setIsLoadingProfile(false);
        setHasLoadedProfile(true);
      }
    }
  }, [onToast, sessionUserId]);

  const commitProfileUpdate = useCallback(
    async (payload: UserProfileUpdateInput) => {
      if (pendingUpdateRef.current?.userId === sessionUserId) throw new Error("已有个人设置正在保存，请等待完成后重试。");
      // Reads from before or during a write cannot replace its committed result.
      requestVersionRef.current += 1;
      const update = { userId: sessionUserId };
      pendingUpdateRef.current = update;
      try {
        const result = await updateUserProfile(payload);
        if (currentSessionUserIdRef.current !== sessionUserId) return result.profile;
        setProfile(result.profile);
        setHasLoadedProfile(true);
        setProfileError(null);
        if (session) {
          onSessionUpdated({
            ...session,
            user: result.profile.user
          });
        }
        return result.profile;
      } finally {
        if (pendingUpdateRef.current === update) pendingUpdateRef.current = null;
        if (currentSessionUserIdRef.current === sessionUserId) {
          requestVersionRef.current += 1;
          setIsLoadingProfile(false);
        }
      }
    },
    [onSessionUpdated, session, sessionUserId]
  );

  const saveProfile = useCallback(
    async (payload: UserProfileUpdateInput) => {
      if (pendingUpdateRef.current?.userId === sessionUserId) throw new Error("已有个人设置正在保存，请等待完成后重试。");
      setIsSavingProfile(true);
      try {
        await commitProfileUpdate(payload);
        onToast({ message: "个人资料已保存。", tone: "success" });
      } catch (error) {
        const message = readErrorMessage(error);
        onToast({ message: `个人资料保存失败：${message}`, tone: "error" });
        throw error;
      } finally {
        if (currentSessionUserIdRef.current === sessionUserId) setIsSavingProfile(false);
      }
    },
    [commitProfileUpdate, onToast, sessionUserId]
  );

  const savePreferences = useCallback(
    async (payload: UserProfileUpdateInput) => {
      if (pendingUpdateRef.current?.userId === sessionUserId) throw new Error("已有个人设置正在保存，请等待完成后重试。");
      setIsSavingPreferences(true);
      try {
        await commitProfileUpdate(payload);
        onToast({ message: "个人偏好已保存。", tone: "success" });
      } catch (error) {
        const message = readErrorMessage(error);
        onToast({ message: `个人偏好保存失败：${message}`, tone: "error" });
        throw error;
      } finally {
        if (currentSessionUserIdRef.current === sessionUserId) setIsSavingPreferences(false);
      }
    },
    [commitProfileUpdate, onToast, sessionUserId]
  );

  const revokeSession = useCallback(
    async (sessionId: string) => {
      setIsRevokingSession(true);
      try {
        await revokeProfileSession(sessionId);
        onToast({ message: "会话已撤销。", tone: "success" });
        await refreshProfileData();
      } catch (error) {
        const message = readErrorMessage(error);
        onToast({ message: `会话撤销失败：${message}`, tone: "error" });
        throw error;
      } finally {
        setIsRevokingSession(false);
      }
    },
    [onToast, refreshProfileData]
  );

  const revokeOtherSessions = useCallback(async () => {
    setIsRevokingSession(true);
    try {
      await revokeOtherProfileSessions();
      onToast({ message: "其他设备已退出。", tone: "success" });
      await refreshProfileData();
    } catch (error) {
      const message = readErrorMessage(error);
      onToast({ message: `退出其他设备失败：${message}`, tone: "error" });
      throw error;
    } finally {
      setIsRevokingSession(false);
    }
  }, [onToast, refreshProfileData]);

  return {
    profile,
    profileSessions,
    isLoadingProfile,
    isSavingProfile,
    isSavingPreferences,
    isRevokingSession,
    profileError,
    hasLoadedProfile,
    refreshProfileData,
    saveProfile,
    savePreferences,
    revokeSession,
    revokeOtherSessions
  };
}
