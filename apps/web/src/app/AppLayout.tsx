import { ReactNode, useEffect, useRef, useState } from "react";
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (userMenuRef.current.contains(event.target as Node)) return;
      setIsUserMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="app-layout workspace-shell">
      <header className="workspace-topbar panel">
        <div className="workspace-brand" aria-label="wemail 工作台品牌">
          <span className="workspace-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation">
              <path
                d="M3 7.75A2.75 2.75 0 0 1 5.75 5h12.5A2.75 2.75 0 0 1 21 7.75v8.5A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25zm2.12-.25L12 12.42l6.88-4.92H5.12zm13.38 9.86a1.1 1.1 0 0 0 .3-.76V8.8l-6.16 4.4a1.1 1.1 0 0 1-1.28 0L5.2 8.8v7.8c0 .28.1.56.3.76.2.2.48.3.76.3h11.48c.28 0 .56-.1.76-.3"
                fill="currentColor"
              />
            </svg>
          </span>
          <div>
            <strong>WeMail</strong>
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

        <div className="workspace-topbar-actions">
          <button
            className="workspace-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            type="button"
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
          <div className="workspace-user-menu" ref={userMenuRef}>
            <button
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-label="用户菜单"
              className="workspace-user-trigger"
              onClick={() => setIsUserMenuOpen((currentState) => !currentState)}
              type="button"
            >
              <span>{session.user.email}</span>
              <svg viewBox="0 0 20 20" role="presentation">
                <path
                  d="M5.22 7.97a.75.75 0 0 1 1.06 0L10 11.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.03a.75.75 0 0 1 0-1.06"
                  fill="currentColor"
                />
              </svg>
            </button>
            {isUserMenuOpen ? (
              <div className="workspace-user-dropdown panel" role="menu">
                <button
                  className="workspace-user-dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <svg viewBox="0 0 20 20" role="presentation">
                    <path
                      d="M10.25 3a.75.75 0 0 1 .75-.75h4A1.75 1.75 0 0 1 16.75 4v12A1.75 1.75 0 0 1 15 17.75h-4a.75.75 0 0 1 0-1.5h4a.25.25 0 0 0 .25-.25V4A.25.25 0 0 0 15 3.75h-4a.75.75 0 0 1-.75-.75M9.78 6.22a.75.75 0 0 1 0 1.06L8.31 8.75H13a.75.75 0 0 1 0 1.5H8.31l1.47 1.47a.75.75 0 1 1-1.06 1.06l-2.75-2.75a.75.75 0 0 1 0-1.06l2.75-2.75a.75.75 0 0 1 1.06 0"
                      fill="currentColor"
                    />
                  </svg>
                  <span>退出登录</span>
                </button>
              </div>
            ) : null}
          </div>
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
