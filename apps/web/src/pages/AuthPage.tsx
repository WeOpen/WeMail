import type { FormEvent, KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthForms } from "../features/auth/AuthForms";

type AuthPageProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

const AUTH_MODES = ["login", "register"] as const;

export function AuthPage({ authError, onRegister, onLogin }: AuthPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname === "/register" ? "register" : "login";

  function switchMode(nextMode: (typeof AUTH_MODES)[number]) {
    if (nextMode === mode) return;
    void navigate(nextMode === "login" ? "/login" : "/register");
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

  if (location.pathname !== "/login" && location.pathname !== "/register") {
    return (
      <div className="landing-shell">
        <header className="landing-topbar">
          <div>
            <p className="eyebrow">wemail</p>
            <p className="landing-subtitle">团队临时邮箱与管理控制台</p>
          </div>
          <div className="hero-actions">
            <Link className="hero-action primary" to="/login">
              登录
            </Link>
            <Link className="hero-action secondary" to="/register">
              注册
            </Link>
          </div>
        </header>
        <main className="landing-main">
          <section className="landing-hero">
            <div className="hero-blocks" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className="eyebrow">自托管 · 邀请制 · Cloudflare 优先</p>
            <h1>自托管临时邮箱，给团队一套可控的收信与管理工作台</h1>
            <p className="hero-copy">
              wemail 把临时邮箱、邀请码、外发能力、Telegram 通知和后台治理整合到同一套界面里，适合团队内部测试、运营协作和自动化场景。
            </p>
            <div className="hero-badges">
              <span>落地页 + 登录分流</span>
              <span>邀请码注册</span>
              <span>多邮箱收发</span>
              <span>后台治理</span>
            </div>
            <div className="landing-feature-grid">
              <article className="landing-feature-card">
                <p className="panel-kicker">统一入口</p>
                <h2>首页只做转化</h2>
                <p>首页聚焦价值表达和转化动作，登录与注册单独进入认证页，避免首屏信息过载。</p>
              </article>
              <article className="landing-feature-card">
                <p className="panel-kicker">团队协作</p>
                <h2>后台集中治理</h2>
                <p>管理员可以统一管理邀请码、用户配额、功能开关和邮箱概览，适合内部平台运营。</p>
              </article>
              <article className="landing-feature-card">
                <p className="panel-kicker">开发友好</p>
                <h2>自动化能力完整</h2>
                <p>支持 API Key、Telegram 通知和 Cloudflare 部署，方便开发、测试和联调使用。</p>
              </article>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="eyebrow">{mode === "login" ? "账号登录" : "邀请码注册"}</p>
          <h1>{mode === "login" ? "登录到 wemail" : "创建你的 wemail 账号"}</h1>
          <p className="hero-copy">
            {mode === "login"
              ? "在同一个认证入口里切换登录与注册，进入你的邮箱工作台与后台。"
              : "通过邀请码完成注册，认证成功后直接进入你的团队邮箱工作区。"}
          </p>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="认证方式切换" onKeyDown={handleTabsKeyDown}>
          <button
            aria-controls="auth-panel-login"
            aria-selected={mode === "login"}
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            id="auth-tab-login"
            onClick={() => switchMode("login")}
            role="tab"
            tabIndex={mode === "login" ? 0 : -1}
            type="button"
          >
            登录
          </button>
          <button
            aria-controls="auth-panel-register"
            aria-selected={mode === "register"}
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            id="auth-tab-register"
            onClick={() => switchMode("register")}
            role="tab"
            tabIndex={mode === "register" ? 0 : -1}
            type="button"
          >
            注册
          </button>
        </div>
        <AuthForms authError={authError} onRegister={onRegister} onLogin={onLogin} mode={mode} />
      </section>
    </div>
  );
}
