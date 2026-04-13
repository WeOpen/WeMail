import { useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";

import { AuthForms } from "../features/auth/AuthForms";

type AuthPageProps = {
  authError: string | null;
  onRegister: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function AuthPage({ authError, onRegister, onLogin }: AuthPageProps) {
  const location = useLocation();
  const initialMode = location.pathname === "/register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  const heroActions = useMemo(
    () => (
      <div className="hero-actions">
        <Link className="hero-action primary" to="/login" onClick={() => setMode("login")}>
          登录
        </Link>
        <Link className="hero-action secondary" to="/register" onClick={() => setMode("register")}>
          注册
        </Link>
      </div>
    ),
    []
  );

  if (location.pathname !== "/login" && location.pathname !== "/register") {
    return (
      <div className="landing-shell">
        <header className="landing-topbar">
          <div>
            <p className="eyebrow">wemail</p>
            <p className="landing-subtitle">团队临时邮箱与管理控制台</p>
          </div>
          {heroActions}
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
      <section className="auth-hero-card">
        <p className="eyebrow">欢迎回来</p>
        <h1>{mode === "login" ? "登录到 wemail" : "注册 wemail 账号"}</h1>
        <p className="hero-copy">
          {mode === "login"
            ? "使用你的团队账号进入邮箱工作台与后台。"
            : "通过邀请码注册新账号，创建属于你的临时邮箱工作区。"}
        </p>
        <div className="hero-actions" role="tablist" aria-label="认证方式切换">
          <Link
            className={mode === "login" ? "hero-action primary" : "hero-action secondary"}
            to="/login"
            onClick={() => setMode("login")}
          >
            登录
          </Link>
          <Link
            className={mode === "register" ? "hero-action primary" : "hero-action secondary"}
            to="/register"
            onClick={() => setMode("register")}
          >
            注册
          </Link>
        </div>
      </section>
      <AuthForms authError={authError} onRegister={onRegister} onLogin={onLogin} mode={mode} />
    </div>
  );
}
