import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mailbox,
  Megaphone,
  MoonStar,
  Settings2,
  SunMedium,
  UserRound,
  Users,
  Webhook
} from "lucide-react";

import type { SessionSummary } from "@wemail/shared";

import { Button, ButtonLink } from "../shared/button";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "../shared/tabs";
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

function buildUserDisplayName(email: string) {
  return email.split("@")[0] || email;
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
  const location = useLocation();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSettingsMenuOpen, setIsMobileSettingsMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileDockRef = useRef<HTMLDivElement | null>(null);
  const railScrollRef = useRef<HTMLElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const userDisplayName = buildUserDisplayName(session.user.email);
  const workspaceNavItems = shell.railSections.find((section) => section.title === "工作台")?.items ?? [];
  const settingsNavItems = shell.railSections.find((section) => section.title === "设置")?.items ?? [];
  const isSettingsActive = settingsNavItems.some((item) => item.id === shell.activePrimaryId);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;

      if (userMenuRef.current && !userMenuRef.current.contains(targetNode)) {
        setIsUserMenuOpen(false);
      }

      if (mobileDockRef.current && !mobileDockRef.current.contains(targetNode)) {
        setIsMobileSettingsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileSettingsMenuOpen(false);
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
    setIsMobileSettingsMenuOpen(false);
  }, [location.pathname]);

  const activeSecondaryRoute =
    shell.secondaryNav.find((item) => item.to === location.pathname)?.to ?? shell.secondaryNav[0]?.to ?? "";

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
            <nav aria-label={`${shell.activePrimaryLabel} 二级菜单`} className="workspace-secondary-tabs-nav">
              <Tabs
                activationMode="automatic"
                className="workspace-secondary-tabs"
                onValueChange={(nextValue) => {
                  if (!nextValue || nextValue === location.pathname) return;
                  void navigate(nextValue);
                }}
                value={activeSecondaryRoute}
                variant="segmented"
              >
                <TabsList className="workspace-pill-nav workspace-secondary-nav">
                  {shell.secondaryNav.map((item) => (
                    <TabsTrigger className="workspace-pill-link" key={item.to} value={item.to}>
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {shell.secondaryNav.map((item) => (
                  <TabsPanel className="sr-only" forceMount key={item.to} value={item.to} />
                ))}
              </Tabs>
            </nav>
          ) : (
            <div aria-label="当前左侧菜单" className="workspace-pill-nav workspace-secondary-nav workspace-secondary-nav-single">
              <span className="ui-button ui-button-pill ui-button-size-sm is-active workspace-pill-link workspace-pill-link-static" aria-current="page">
                <span className="ui-button-label">{shell.activePrimaryLabel}</span>
              </span>
            </div>
          )}
        </div>

        <div className="workspace-topbar-actions">
          <Button
            iconOnly
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            size="sm"
            variant="icon"
          >
            <ThemeIcon theme={theme} />
          </Button>

          <div className="workspace-user-menu" ref={userMenuRef}>
            <Button
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-label="用户菜单"
              className="workspace-user-trigger"
              iconOnly
              onClick={() => setIsUserMenuOpen((currentState) => !currentState)}
              size="sm"
              variant="secondary"
            >
              <UserRound absoluteStrokeWidth aria-hidden="true" className="workspace-user-trigger-icon workspace-icon" strokeWidth={1.9} />
            </Button>

            {isUserMenuOpen ? (
              <div className="workspace-user-dropdown panel" role="menu">
                <div className="workspace-user-dropdown-header" role="none">
                  <strong>姓名：{userDisplayName}</strong>
                </div>
                <ButtonLink
                  className="workspace-user-dropdown-item"
                  fullWidth
                  leadingIcon={<Settings2 absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />}
                  onClick={() => setIsUserMenuOpen(false)}
                  role="menuitem"
                  size="sm"
                  to="/system/profile"
                  variant="text"
                >
                  个人设置
                </ButtonLink>
                <Button
                  className="workspace-user-dropdown-item"
                  fullWidth
                  leadingIcon={<LogOut absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />}
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  role="menuitem"
                  size="sm"
                  variant="text"
                >
                  退出登录
                </Button>
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
          <div className={`workspace-route workspace-route-${shell.routeKey}`}>{children}</div>
        </div>
      </div>

      <div className="workspace-mobile-dock-shell" ref={mobileDockRef}>
        {isMobileSettingsMenuOpen ? (
          <nav aria-label="移动端设置菜单" className="workspace-mobile-settings-bar" role="menu">
            {settingsNavItems.map((item) => (
              <NavLink
                aria-label={item.label}
                className={({ isActive }) =>
                  `workspace-mobile-dock-item workspace-mobile-settings-item${isActive || item.id === shell.activePrimaryId ? " active" : ""}`
                }
                key={`mobile-settings-${item.id}`}
                onClick={() => setIsMobileSettingsMenuOpen(false)}
                role="menuitem"
                to={item.to}
              >
                <RailIcon icon={item.icon} />
                <span className="sr-only">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        ) : null}

        <nav aria-label="移动端工作台 Dock" className="workspace-mobile-dock">
          {workspaceNavItems.map((item) => (
            <NavLink
              aria-label={item.label}
              className={({ isActive }) =>
                `workspace-mobile-dock-item workspace-mobile-workspace-item${isActive || item.id === shell.activePrimaryId ? " active" : ""}`
              }
              key={`mobile-workspace-${item.id}`}
              onClick={() => setIsMobileSettingsMenuOpen(false)}
              to={item.to}
            >
              <RailIcon icon={item.icon} />
              <span className="sr-only">{item.label}</span>
            </NavLink>
          ))}
          <button
            aria-expanded={isMobileSettingsMenuOpen}
            aria-haspopup="menu"
            aria-label="设置菜单"
            className={`workspace-mobile-dock-item workspace-mobile-settings-trigger${isMobileSettingsMenuOpen || isSettingsActive ? " active" : ""}`}
            onClick={() => setIsMobileSettingsMenuOpen((currentState) => !currentState)}
            type="button"
          >
            <Settings2 absoluteStrokeWidth aria-hidden="true" className="workspace-rail-icon workspace-icon" strokeWidth={1.9} />
          </button>
        </nav>
      </div>
    </div>
  );
}
