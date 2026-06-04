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

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "User already exists": "该邮箱已注册，请直接登录或更换邮箱。",
  "Invite is invalid": "邀请码无效或已被使用。",
  "Invalid credentials": "邮箱或密码不正确。",
  "email is required": "请输入邮箱。",
  "password is required": "请输入密码。",
  "inviteCode is required": "请输入邀请码。",
  "Not authenticated": "登录状态已失效，请重新登录。",
  "User not found": "账号不存在。"
};

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function localizeAuthError(error: unknown) {
  const message = readErrorMessage(error).trim();
  if (!message) return "操作失败，请稍后重试。";

  const translatedMessage = AUTH_ERROR_MESSAGES[message];
  if (translatedMessage) return translatedMessage;

  if (/failed to fetch|networkerror/i.test(message)) {
    return "无法连接服务器，请检查网络后重试。";
  }

  if (/request failed/i.test(message)) {
    return "请求失败，请稍后重试。";
  }

  if (/[\u4e00-\u9fff]/.test(message)) return message;

  return "操作失败，请稍后重试。";
}

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
        setAuthError(localizeAuthError(error));
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
        setAuthError(localizeAuthError(error));
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
