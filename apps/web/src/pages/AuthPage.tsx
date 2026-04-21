import type { FormEvent, KeyboardEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthForms } from "../features/auth/AuthForms";
import { WemailLandingPage } from "../features/landing/WemailLandingPage";
import { Button } from "../shared/button";
import { WemailLogo } from "../shared/WemailLogo";
import { WemailWordmark } from "../shared/WemailWordmark";

type AuthPageProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleTheme: () => void;
  theme: "dark" | "light";
};

const AUTH_MODES = ["login", "register"] as const;

export function AuthPage({ authError, onRegister, onLogin, onToggleTheme, theme }: AuthPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname === "/register" ? "register" : "login";

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
        <AuthForms authError={authError} onRegister={onRegister} onLogin={onLogin} mode={mode} />
      </section>
    </div>
  );
}
