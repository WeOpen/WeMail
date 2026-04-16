import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mailbox,
  Megaphone,
  MoonStar,
  Settings2,
  SunMedium,
  Users,
  Webhook
} from "lucide-react";

import type { SessionSummary } from "@wemail/shared";

import { WemailBrandLockup } from "../shared/WemailBrandLockup";
import type { WorkspaceRailIcon, WorkspaceShellState } from "./workspaceShell";
import type { WorkspaceTheme } from "./useWorkspaceTheme";

type AppLayoutProps = {
  session: SessionSummary;
  onLogout: () => void;
  onToggleTheme: () => void;
  theme: WorkspaceTheme;
  shell: WorkspaceShellState;
  children: ReactNode;
};

function ThemeIcon({ theme }: { theme: WorkspaceTheme }) {
  return theme === "dark" ? (
    <SunMedium absoluteStrokeWidth aria-hidden="true" className="workspace-theme-icon workspace-icon" strokeWidth={1.8} />
  ) : (
    <MoonStar absoluteStrokeWidth aria-hidden="true" className="workspace-theme-icon workspace-icon" strokeWidth={1.8} />
  );
}

function RailIcon({ icon }: { icon: WorkspaceRailIcon }) {
  const props = {
    absoluteStrokeWidth: true,
    "aria-hidden": true as const,
    className: "workspace-rail-icon workspace-icon",
    strokeWidth: 1.9
  };

  switch (icon) {
    case "dashboard":
      return <LayoutDashboard {...props} />;
    case "accounts":
      return <Mailbox {...props} />;
    case "mail":
      return <Inbox {...props} />;
    case "users":
      return <Users {...props} />;
    case "keys":
      return <KeyRound {...props} />;
    case "webhook":
      return <Webhook {...props} />;
    case "telegram":
      return <Bell {...props} />;
    case "docs":
      return <FileText {...props} />;
    case "announcements":
      return <Megaphone {...props} />;
    case "system":
      return <Settings2 {...props} />;
    default:
      return <Inbox {...props} />;
  }
}

export function AppLayout({
  session,
  onLogout,
  onToggleTheme,
  theme,
  shell,
  children
}: AppLayoutProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const railScrollRef = useRef<HTMLElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const areas = [railScrollRef.current, mainScrollRef.current].filter(Boolean) as Array<HTMLElement>;
    if (areas.length === 0) return;

    const cleanups = areas.map((area) => {
      let resetTimer: number | null = null;

      const markActive = () => {
        area.dataset.scrollActive = "true";
        if (resetTimer) {
          window.clearTimeout(resetTimer);
        }
        resetTimer = window.setTimeout(() => {
          area.dataset.scrollActive = "false";
        }, 720);
      };

      const markIdle = () => {
        if (resetTimer) {
          window.clearTimeout(resetTimer);
        }
        area.dataset.scrollActive = "false";
      };

      area.dataset.scrollActive = "false";
      area.addEventListener("scroll", markActive, { passive: true });
      area.addEventListener("pointerenter", markActive);
      area.addEventListener("pointerleave", markIdle);

      return () => {
        if (resetTimer) {
          window.clearTimeout(resetTimer);
        }
        area.removeEventListener("scroll", markActive);
        area.removeEventListener("pointerenter", markActive);
        area.removeEventListener("pointerleave", markIdle);
        delete area.dataset.scrollActive;
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <div className="app-layout workspace-shell">
      <header className="workspace-topbar panel">
        <div className="workspace-brand" aria-label="WeMail 工作台品牌">
          <WemailBrandLockup compact className="workspace-brand-lockup" label="WeMail logo" />
        </div>

        <div className="workspace-topbar-center">
          {shell.secondaryNav.length > 0 ? (
            <nav className="workspace-pill-nav workspace-secondary-nav" aria-label={`${shell.activePrimaryLabel} 二级菜单`}>
              {shell.secondaryNav.map((item) => (
                <NavLink key={item.to} className="workspace-pill-link" to={item.to} end>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          ) : (
            <div aria-label="当前左侧菜单" className="workspace-pill-nav workspace-secondary-nav workspace-secondary-nav-single">
              <span className="workspace-pill-link workspace-pill-link-static active" aria-current="page">
                <span>{shell.activePrimaryLabel}</span>
              </span>
            </div>
          )}
        </div>

        <div className="workspace-topbar-actions">
          <button
            className="workspace-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            type="button"
          >
            <ThemeIcon theme={theme} />
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
              <ChevronDown absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
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
                  <LogOut absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
                  <span>退出登录</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="workspace-frame">
        <aside className="workspace-rail-shell panel" aria-label="workspace sidebar">
          <nav className="workspace-rail workspace-scroll-area" ref={railScrollRef} aria-label="工作台导航">
            {shell.railSections.map((section) => (
              <section className="workspace-rail-section" key={section.title}>
                <p className="panel-kicker">{section.title}</p>
                <div className="workspace-rail-list">
                  {section.items.map((item) => (
                    <NavLink
                      key={`${section.title}-${item.label}`}
                      className={({ isActive }) =>
                        `workspace-rail-link${isActive || item.id === shell.activePrimaryId ? " active" : ""}`
                      }
                      to={item.to}
                    >
                      <span className="workspace-rail-icon-chip">
                        <RailIcon icon={item.icon} />
                      </span>
                      <div className="workspace-rail-copy">
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <div className="workspace-main-column workspace-scroll-area" ref={mainScrollRef}>
          {shell.hero.variant !== "dashboard" ? (
            <section className="workspace-hero panel">
              <div className="workspace-hero-copy">
                <p className="panel-kicker">{shell.hero.eyebrow}</p>
                <h1>{shell.hero.title}</h1>
                <p className="hero-copy workspace-hero-description">{shell.hero.description}</p>
              </div>

              {shell.hero.actions.length > 0 ? (
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
              ) : null}

              {shell.hero.stats.length > 0 ? (
                <div className="workspace-hero-stats" aria-label={`${shell.routeLabel} highlights`}>
                  {shell.hero.stats.map((stat) => (
                    <article className="workspace-stat-card" key={stat.label}>
                      <p>{stat.label}</p>
                      <strong>{stat.value}</strong>
                      <span>{stat.detail}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className={`workspace-route workspace-route-${shell.routeKey}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
