import { FormEvent, useCallback } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import { loginWithPasswordAction, logoutSessionAction, registerWithInviteAction } from "./actions";
import { queryCurrentSession } from "./queries";

type UseAuthSessionOptions = {
  onSignedIn: (session: SessionSummary) => void;
  onSignedOut: () => void;
  onToast: (toast: WemailToastInput) => void;
};

export function useAuthSession({ onSignedIn, onSignedOut, onToast }: UseAuthSessionOptions) {
  const authError = useAppStore((state) => state.authError);
  const loadingSession = useAppStore((state) => state.loadingSession);
  const setAuthError = useAppStore((state) => state.setAuthError);
  const setLoadingSession = useAppStore((state) => state.setLoadingSession);

  const refreshSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const nextSession = await queryCurrentSession();
      onSignedIn(nextSession);
      setAuthError(null);
    } catch {
      onSignedOut();
    } finally {
      setLoadingSession(false);
    }
  }, [onSignedIn, onSignedOut, setAuthError, setLoadingSession]);

  const handleRegister = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        const nextSession = await registerWithInviteAction({
          email: form.get("email"),
          password: form.get("password"),
          inviteCode: form.get("inviteCode")
        });
        onSignedIn(nextSession);
        onToast({ message: "注册成功，欢迎进入你的邮箱工作台。", tone: "success" });
        setAuthError(null);
      } catch (error) {
        setAuthError((error as Error).message);
      }
    },
    [onSignedIn, onToast, setAuthError]
  );

  const handleLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        const nextSession = await loginWithPasswordAction({
          email: form.get("email"),
          password: form.get("password")
        });
        onSignedIn(nextSession);
        onToast({ message: "登录成功。", tone: "success" });
        setAuthError(null);
      } catch (error) {
        setAuthError((error as Error).message);
      }
    },
    [onSignedIn, onToast, setAuthError]
  );

  const handleLogout = useCallback(async () => {
    await logoutSessionAction();
    onSignedOut();
    onToast({ message: "已退出登录。", tone: "info" });
  }, [onSignedOut, onToast]);

  return {
    authError,
    loadingSession,
    refreshSession,
    handleRegister,
    handleLogin,
    handleLogout
  };
}
