import type { FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthForms } from "../features/auth/AuthForms";
import { WemailLandingPage } from "../features/landing/WemailLandingPage";
import { Button } from "../shared/button";
import { FormField, TextInput } from "../shared/form";
import { OverlayDialog } from "../shared/overlay";
import { WemailLogo } from "../shared/WemailLogo";
import { WemailWordmark } from "../shared/WemailWordmark";

type AuthPageProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onOAuthFinalize: (payload: { provider: "github" | "linuxdo"; ticket: string; inviteCode: string }) => Promise<void>;
  onToggleTheme: () => void;
  theme: "dark" | "light";
};

const AUTH_MODES = ["login", "register"] as const;

function resolveOAuthNext(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (next.startsWith("/login") || next.startsWith("/register")) return "/dashboard";
  return next;
}

function isOAuthProvider(value: string | null): value is "github" | "linuxdo" {
  return value === "github" || value === "linuxdo";
}

function resolveOAuthCallbackError(searchParams: URLSearchParams) {
  const provider = searchParams.get("provider");
  if (searchParams.get("oauth") !== "error" || !isOAuthProvider(provider)) return null;

  const providerName = provider === "github" ? "GitHub" : "LinuxDo";
  if (searchParams.get("reason") === "email_required") {
    return `${providerName} 没有返回可用邮箱。请确认账号邮箱已验证，并重新授权登录。`;
  }
  return `${providerName} 登录暂时失败，请稍后重试。`;
}

export function AuthPage({ authError, onRegister, onLogin, onOAuthFinalize, onToggleTheme, theme }: AuthPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname === "/register" ? "register" : "login";
  const searchParams = new URLSearchParams(location.search);
  const oauthProvider = searchParams.get("provider");
  const oauthTicket = searchParams.get("ticket");
  const isOAuthInviteOpen = searchParams.get("oauth") === "invite" && isOAuthProvider(oauthProvider) && Boolean(oauthTicket);
  const oauthCallbackError = resolveOAuthCallbackError(searchParams);
  const [oauthInviteCode, setOAuthInviteCode] = useState("");
  const [isOAuthInviteSubmitting, setIsOAuthInviteSubmitting] = useState(false);

  function switchMode(nextMode: (typeof AUTH_MODES)[number]) {
    if (nextMode === mode) return;
    const nextPath = nextMode === "login" ? "/login" : "/register";
    void navigate(`${nextPath}${location.search}`);
  }

  function handleTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = AUTH_MODES.indexOf(mode);

    if (event.key === "Home") {
      switchMode(AUTH_MODES[0]);
      return;
    }

    if (event.key === "End") {
      switchMode(AUTH_MODES[AUTH_MODES.length - 1]);
      return;
    }

    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = (currentIndex + direction + AUTH_MODES.length) % AUTH_MODES.length;
    switchMode(AUTH_MODES[nextIndex]);
  }

  async function handleOAuthInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOAuthProvider(oauthProvider) || !oauthTicket || isOAuthInviteSubmitting) return;
    setIsOAuthInviteSubmitting(true);
    try {
      await onOAuthFinalize({
        provider: oauthProvider,
        ticket: oauthTicket,
        inviteCode: oauthInviteCode
      });
    } finally {
      setIsOAuthInviteSubmitting(false);
    }
  }

  function closeOAuthInviteDialog() {
    void navigate("/login", { replace: true });
  }

  if (location.pathname === "/") {
    return <WemailLandingPage onToggleTheme={onToggleTheme} theme={theme} />;
  }

  if (location.pathname !== "/login" && location.pathname !== "/register") {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/login?next=${encodeURIComponent(next)}`} />;
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-card-header">
          <Link aria-label="WeMail auth brand" className="auth-brand-stack" to="/">
            <span aria-hidden="true" className="auth-brand-mark">
              <WemailLogo className="auth-brand-logo" title="" />
            </span>
            <WemailWordmark className="auth-brand-wordmark" />
          </Link>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="认证方式切换" onKeyDown={handleTabsKeyDown}>
          <Button
            aria-controls="auth-panel-login"
            aria-selected={mode === "login"}
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            id="auth-tab-login"
            isActive={mode === "login"}
            onClick={() => switchMode("login")}
            role="tab"
            size="md"
            tabIndex={mode === "login" ? 0 : -1}
            variant="pill"
          >
            登录
          </Button>
          <Button
            aria-controls="auth-panel-register"
            aria-selected={mode === "register"}
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            id="auth-tab-register"
            isActive={mode === "register"}
            onClick={() => switchMode("register")}
            role="tab"
            size="md"
            tabIndex={mode === "register" ? 0 : -1}
            variant="pill"
          >
            注册
          </Button>
        </div>
        {oauthCallbackError ? (
          <p className="error-banner" role="alert">
            {oauthCallbackError}
          </p>
        ) : null}
        <AuthForms authError={authError} onRegister={onRegister} onLogin={onLogin} mode={mode} oauthNext={resolveOAuthNext(location.search)} />
      </section>
      {isOAuthInviteOpen ? (
        <OverlayDialog
          className="auth-oauth-invite-dialog"
          closeLabel="关闭邀请码输入"
          closeOnBackdrop={false}
          onClose={closeOAuthInviteDialog}
          size="sm"
          title="输入邀请码"
        >
          <form className="auth-oauth-invite-form" noValidate onSubmit={handleOAuthInviteSubmit}>
            {authError ? <p className="error-banner">{authError}</p> : null}
            <FormField htmlFor="oauth-invite-code" label="邀请码" required>
              <TextInput
                autoFocus
                id="oauth-invite-code"
                name="inviteCode"
                onChange={(event) => setOAuthInviteCode(event.target.value)}
                required
                value={oauthInviteCode}
              />
            </FormField>
            <div className="workspace-dialog-actions">
              <Button onClick={closeOAuthInviteDialog} variant="secondary">
                取消
              </Button>
              <Button isLoading={isOAuthInviteSubmitting} loadingLabel="验证中" type="submit" variant="primary">
                继续进入
              </Button>
            </div>
          </form>
        </OverlayDialog>
      ) : null}
    </div>
  );
}
