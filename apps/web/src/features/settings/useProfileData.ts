import { useCallback, useEffect, useState } from "react";

import type { SessionSummary, UserProfileSummary, UserProfileUpdateInput } from "@wemail/shared";

import type { WemailToastInput } from "../../shared/toast";
import { fetchUserProfile, updateUserProfile } from "./api";

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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  useEffect(() => {
    if (session) return;
    setProfile(null);
    setProfileError(null);
    setHasLoadedProfile(false);
  }, [session]);

  const refreshProfileData = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setProfileError(null);
      setHasLoadedProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const payload = await fetchUserProfile();
      setProfile(payload.profile ?? null);
    } catch (error) {
      const message = readErrorMessage(error);
      setProfile(null);
      setProfileError(message);
      onToast({ message: `个人设置同步失败：${message}`, tone: "error" });
    } finally {
      setIsLoadingProfile(false);
      setHasLoadedProfile(true);
    }
  }, [onToast, session]);

  const commitProfileUpdate = useCallback(
    async (payload: UserProfileUpdateInput) => {
      const result = await updateUserProfile(payload);
      setProfile(result.profile);
      if (session) {
        onSessionUpdated({
          ...session,
          user: result.profile.user
        });
      }
      return result.profile;
    },
    [onSessionUpdated, session]
  );

  const saveProfile = useCallback(
    async (payload: UserProfileUpdateInput) => {
      setIsSavingProfile(true);
      try {
        await commitProfileUpdate(payload);
        onToast({ message: "个人资料已保存。", tone: "success" });
      } catch (error) {
        const message = readErrorMessage(error);
        onToast({ message: `个人资料保存失败：${message}`, tone: "error" });
        throw error;
      } finally {
        setIsSavingProfile(false);
      }
    },
    [commitProfileUpdate, onToast]
  );

  const savePreferences = useCallback(
    async (payload: UserProfileUpdateInput) => {
      setIsSavingPreferences(true);
      try {
        await commitProfileUpdate(payload);
        onToast({ message: "个人偏好已保存。", tone: "success" });
      } catch (error) {
        const message = readErrorMessage(error);
        onToast({ message: `个人偏好保存失败：${message}`, tone: "error" });
        throw error;
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [commitProfileUpdate, onToast]
  );

  return {
    profile,
    isLoadingProfile,
    isSavingProfile,
    isSavingPreferences,
    profileError,
    hasLoadedProfile,
    refreshProfileData,
    saveProfile,
    savePreferences
  };
}
