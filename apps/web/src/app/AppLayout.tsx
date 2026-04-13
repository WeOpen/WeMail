import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import type { SessionSummary } from "@wemail/shared";

import type { WorkspaceShellState } from "./workspaceShell";
import type { WorkspaceTheme } from "./useWorkspaceTheme";

type AppLayoutProps = {
  session: SessionSummary;
  notice: string | null;
  onLogout: () => void;
  onToggleTheme: () => void;
  theme: WorkspaceTheme;
  shell: WorkspaceShellState;
  children: ReactNode;
};

export function AppLayout({
  session,
  notice,
  onLogout,
  onToggleTheme,
  theme,
  shell,
  children
}: AppLayoutProps) {
  return (
    <div className="app-layout workspace-shell">
      <header className="workspace-topbar panel">
        <div className="workspace-brand" aria-label="wemail 工作台品牌">
          <span className="workspace-brand-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>wemail</strong>
            <span>运营工作台</span>
          </div>
        </div>

        <nav className="workspace-pill-nav" aria-label="工作台导航">
          {shell.primaryNav.map((item) => (
            <NavLink key={item.to} className="workspace-pill-link" to={item.to} end={item.to === "/"}>
              <span>{item.label}</span>
              {item.badge ? <small>{item.badge}</small> : null}
            </NavLink>
          ))}
        </nav>

        <div className="workspace-search" aria-label="工作台快速搜索">
          <span aria-hidden="true">⌘K</span>
          <strong>{shell.searchPlaceholder}</strong>
        </div>

        <div className="workspace-topbar-actions">
          <div className="workspace-identity-pill">
            <strong>{session.user.email}</strong>
            <span>{session.user.role === "admin" ? "管理员" : "成员"}</span>
          </div>
          <button
            className="workspace-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            type="button"
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
          <button className="ghost-button workspace-logout-button" onClick={onLogout} type="button">
            退出登录
          </button>
        </div>
      </header>

      <div className="workspace-frame">
        <aside className="workspace-rail panel" aria-label="工作台侧栏">
          {shell.railSections.map((section) => (
            <section className="workspace-rail-section" key={section.title}>
              <p className="panel-kicker">{section.title}</p>
              <div className="workspace-rail-list">
                {section.items.map((item) =>
                  item.kind === "link" ? (
                    <NavLink
                      key={`${section.title}-${item.label}`}
                      className="workspace-rail-link"
                      to={item.to}
                      end={item.to === "/"}
                    >
                      <span>{item.label}</span>
                      <div>
                        {item.badge ? <small>{item.badge}</small> : null}
                        {item.hint ? <em>{item.hint}</em> : null}
                      </div>
                    </NavLink>
                  ) : (
                    <div className="workspace-rail-stat" key={`${section.title}-${item.label}`}>
                      <div>
                        <strong>{item.label}</strong>
                        {item.hint ? <span>{item.hint}</span> : null}
                      </div>
                      <small>{item.value}</small>
                    </div>
                  )
                )}
              </div>
            </section>
          ))}
        </aside>

        <div className="workspace-main-column">
          <section className="workspace-hero panel">
            <div className="workspace-hero-copy">
              <p className="panel-kicker">{shell.hero.eyebrow}</p>
              <h1>{shell.hero.title}</h1>
              <p className="hero-copy workspace-hero-description">{shell.hero.description}</p>
            </div>
            <div className="workspace-hero-actions">
              {shell.hero.actions.map((action) =>
                action.kind === "link" && action.to ? (
                  <NavLink
                    key={`${action.label}-${action.to}`}
                    className={`workspace-action-button ${action.tone}`}
                    to={action.to}
                  >
                    {action.label}
                  </NavLink>
                ) : (
                  <button
                    key={action.label}
                    className={`workspace-action-button ${action.tone}`}
                    disabled={!action.onClick}
                    onClick={action.onClick}
                    type="button"
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
            <div className="workspace-hero-stats" aria-label={`${shell.routeLabel} highlights`}>
              {shell.hero.stats.map((stat) => (
                <article className="workspace-stat-card" key={stat.label}>
                  <p>{stat.label}</p>
                  <strong>{stat.value}</strong>
                  <span>{stat.detail}</span>
                </article>
              ))}
            </div>
          </section>

          {notice ? <div className="notice-banner workspace-notice-banner">{notice}</div> : null}

          <div className={`workspace-route workspace-route-${shell.routeKey}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
