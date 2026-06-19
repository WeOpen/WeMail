import { type CSSProperties, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, MoonStar, SunMedium, X } from "lucide-react";

import { Button, ButtonLink } from "../../shared/button";
import { WemailBrandLockup } from "../../shared/WemailBrandLockup";
import { landingNavLinks } from "./landing-content";
import "./landing.css";

type PublicSiteNavigationProps = {
  consoleHref?: string;
  isAuthenticated?: boolean;
  onToggleTheme: () => void;
  theme: "dark" | "light";
};

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function useCompactNavigation() {
  const [isCompactNavigation, setIsCompactNavigation] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(max-width: 980px)");
    const update = () => setIsCompactNavigation(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isCompactNavigation;
}

function ThemeIcon({ theme }: { theme: "dark" | "light" }) {
  return theme === "dark" ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />;
}

function resolveSectionHref(pathname: string, href: string) {
  return pathname === "/" ? href : `/${href}`;
}

export function PublicSiteNavigation({ consoleHref = "/dashboard", isAuthenticated = false, onToggleTheme, theme }: PublicSiteNavigationProps) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const isCompactNavigation = useCompactNavigation();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const body = document.body;
    if (isMobileMenuOpen) {
      body.dataset.mobileMenu = "open";
    } else {
      delete body.dataset.mobileMenu;
    }
    return () => {
      delete body.dataset.mobileMenu;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isCompactNavigation) {
      setIsMobileMenuOpen(false);
    }
  }, [isCompactNavigation]);

  return (
    <header className={isScrolled ? "landing-nav-shell is-scrolled" : "landing-nav-shell"}>
      <nav className={isScrolled || isMobileMenuOpen ? "landing-nav is-floating" : "landing-nav"} aria-label="首页导航">
        <div className={isScrolled ? "landing-nav-bar compact" : "landing-nav-bar"}>
          <Link aria-label="WeMail 首页" className="landing-brand" to="/">
            <WemailBrandLockup className="landing-brand-lockup" compact label="WeMail brand lockup" />
          </Link>

          <div className="landing-nav-links" aria-label="首页分区导航">
            {landingNavLinks.map((link) => (
              <a key={link.href} href={resolveSectionHref(location.pathname, link.href)} className="landing-nav-link">
                {link.label}
              </a>
            ))}
            <Link className="landing-nav-link" to="/design-system">
              设计系统
            </Link>
          </div>

          <div className="landing-nav-actions">
            {isAuthenticated ? (
              <ButtonLink size="sm" to={consoleHref} variant="primary">
                控制台
              </ButtonLink>
            ) : (
              <>
                <ButtonLink size="sm" to="/login" variant="secondary">
                  登录
                </ButtonLink>
                <ButtonLink size="sm" to="/register" variant="primary">
                  注册
                </ButtonLink>
              </>
            )}
            {!isCompactNavigation ? (
              <Button
                aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
                className="landing-nav-theme-toggle landing-nav-edge-control"
                iconOnly
                onClick={onToggleTheme}
                size="sm"
                variant="icon"
              >
                <ThemeIcon theme={theme} />
              </Button>
            ) : null}
          </div>

          {isCompactNavigation ? (
            <Button
              aria-controls="landing-mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="切换菜单"
              className="landing-nav-mobile-toggle landing-nav-mobile-toggle-tight landing-nav-edge-control"
              iconOnly
              onClick={() => {
                setIsMobileMenuOpen((current) => !current);
              }}
              size="sm"
              variant="icon"
            >
              {isMobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          ) : null}
        </div>
      </nav>

      {isCompactNavigation && isMobileMenuOpen ? (
        <div className="landing-mobile-menu-backdrop" role="dialog" aria-label="首页移动菜单" aria-modal="true" id="landing-mobile-menu">
          <div className="landing-mobile-menu">
            <div className="landing-mobile-links">
              {landingNavLinks.map((link, index) => (
                <a
                  key={link.href}
                  className="landing-mobile-link"
                  href={resolveSectionHref(location.pathname, link.href)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ ["--menu-delay" as string]: reducedMotion ? "0ms" : `${index * 70}ms` } as CSSProperties}
                >
                  {link.label}
                </a>
              ))}
              <Link
                className="landing-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ ["--menu-delay" as string]: reducedMotion ? "0ms" : `${landingNavLinks.length * 70}ms` } as CSSProperties}
                to="/design-system"
              >
                设计系统
              </Link>
            </div>
            <div className="landing-mobile-actions">
              {isAuthenticated ? (
                <ButtonLink size="sm" to={consoleHref} variant="primary" onClick={() => setIsMobileMenuOpen(false)}>
                  控制台
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink size="sm" to="/login" variant="secondary" onClick={() => setIsMobileMenuOpen(false)}>
                    登录
                  </ButtonLink>
                  <ButtonLink size="sm" to="/register" variant="primary" onClick={() => setIsMobileMenuOpen(false)}>
                    注册
                  </ButtonLink>
                </>
              )}
              <Button
                fullWidth
                className="landing-nav-theme-toggle landing-mobile-theme-toggle"
                leadingIcon={<ThemeIcon theme={theme} />}
                onClick={() => {
                  onToggleTheme();
                  setIsMobileMenuOpen(false);
                }}
                size="sm"
                variant="secondary"
              >
                {theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
