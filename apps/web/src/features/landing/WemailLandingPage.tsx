import { type CSSProperties, type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Eye,
  FileCheck,
  Lock,
  Menu,
  MoonStar,
  Send,
  Shield,
  SunMedium,
  X
} from "lucide-react";

import { Button, ButtonLink } from "../../shared/button";
import { Switch } from "../../shared/switch";
import { WemailBrandLockup } from "../../shared/WemailBrandLockup";
import { AnimatedSphere } from "./AnimatedSphere";
import { AnimatedTetrahedron } from "./AnimatedTetrahedron";
import { AnimatedWave } from "./AnimatedWave";
import {
  certifications,
  developerFeatures,
  developerTabs,
  featureCards,
  footerQuickLinks,
  heroStats,
  heroWords,
  infrastructureLocations,
  integrations,
  landingNavLinks,
  metrics,
  pricingPlans,
  securityCards,
  testimonials,
  trustedCompanies,
  workflowSteps
} from "./landing-content";
import "./landing.css";

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

function useAutoIndex(length: number, delay: number, paused = false) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || length <= 1) return;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, delay);
    return () => window.clearInterval(interval);
  }, [delay, length, paused]);

  return [index, setIndex] as const;
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver !== "function") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function RevealSection({ className, id, children }: { className?: string; id?: string; children: ReactNode }) {
  const { ref, isVisible } = useReveal<HTMLElement>();
  return (
    <section id={id} ref={ref} className={className} data-visible={isVisible}>
      {children}
    </section>
  );
}

function SectionEyebrow({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <span className={centered ? "landing-section-eyebrow centered" : "landing-section-eyebrow"}>
      <span className="landing-section-eyebrow-line" aria-hidden="true" />
      {children}
      {centered ? <span className="landing-section-eyebrow-line" aria-hidden="true" /> : null}
    </span>
  );
}

function AnimatedCodeBlock({
  code,
  fileLabel,
  statusLabel,
  dark = false
}: {
  code: string;
  fileLabel: string;
  statusLabel: string;
  dark?: boolean;
}) {
  return (
    <div className={dark ? "landing-process-code is-animated-code" : "landing-code-card is-animated-code"}>
      <header>
        <div className="landing-window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <small>{fileLabel}</small>
      </header>
      <pre>
        <code>
          {code.split("\n").map((line, lineIndex) => (
            <span
              key={`${fileLabel}-${lineIndex}`}
              className="landing-code-line"
              style={{ ["--code-line-delay" as string]: `${lineIndex * 80}ms` } as CSSProperties}
            >
              <span className="landing-code-line-number">{String(lineIndex + 1).padStart(2, "0")}</span>
              <span className="landing-code-line-content">
                {line.split("").map((character, charIndex) => (
                  <span
                    key={`${fileLabel}-${lineIndex}-${charIndex}`}
                    className="landing-code-char"
                    style={
                      {
                        ["--code-char-delay" as string]: `${lineIndex * 80 + charIndex * 15}ms`
                      } as CSSProperties
                    }
                  >
                    {character === " " ? "\u00A0" : character}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </code>
      </pre>
      <footer>
        <span className="landing-ready-dot" aria-hidden="true" />
        <small>{statusLabel}</small>
      </footer>
    </div>
  );
}

function FeatureVisual({ type }: { type: (typeof featureCards)[number]["visual"] }) {
  if (type === "deploy") {
    return (
      <svg viewBox="0 0 200 160" className="landing-feature-visual-svg" aria-hidden="true">
        <rect x="30" y="20" width="140" height="120" rx="14" className="landing-svg-stroke" />
        {[0, 1, 2, 3, 4].map((index) => (
          <rect
            key={index}
            x="44"
            y={36 + index * 18}
            width={110 - index * 12}
            height="10"
            rx="4"
            className="landing-svg-fill landing-svg-bar"
            style={{ ["--bar-delay" as string]: `${index * 120}ms` } as CSSProperties}
          />
        ))}
        <circle cx="100" cy="132" r="5" className="landing-svg-fill landing-svg-pulse" />
      </svg>
    );
  }

  if (type === "ai") {
    return (
      <svg viewBox="0 0 200 160" className="landing-feature-visual-svg" aria-hidden="true">
        <circle cx="100" cy="80" r="44" className="landing-svg-stroke" />
        <circle cx="100" cy="80" r="20" className="landing-svg-fill-soft landing-svg-pulse" />
        {[0, 1, 2, 3].map((index) => {
          const angle = (Math.PI / 2) * index;
          const x = 100 + Math.cos(angle) * 58;
          const y = 80 + Math.sin(angle) * 58;
          return (
            <g key={index}>
              <line x1="100" y1="80" x2={x} y2={y} className="landing-svg-stroke" />
              <circle cx={x} cy={y} r="8" className="landing-svg-fill-soft" />
            </g>
          );
        })}
      </svg>
    );
  }

  if (type === "collab") {
    return (
      <svg viewBox="0 0 200 160" className="landing-feature-visual-svg" aria-hidden="true">
        <rect x="26" y="24" width="148" height="108" rx="18" className="landing-svg-stroke" />
        <rect x="42" y="42" width="52" height="54" rx="12" className="landing-svg-fill-soft" />
        <rect x="106" y="42" width="52" height="36" rx="12" className="landing-svg-fill-soft" />
        <rect x="106" y="88" width="52" height="24" rx="12" className="landing-svg-fill" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 160" className="landing-feature-visual-svg" aria-hidden="true">
      <path d="M100 26 54 46v34c0 32 21 52 46 60 25-8 46-28 46-60V46Z" className="landing-svg-stroke" />
      <path d="m78 82 14 14 28-30" className="landing-svg-stroke landing-svg-check" />
      {[0, 1, 2].map((index) => (
        <circle key={index} cx={68 + index * 32} cy="46" r="5" className="landing-svg-fill-soft landing-svg-pulse" />
      ))}
    </svg>
  );
}

function SecurityIcon({ icon }: { icon: (typeof securityCards)[number]["icon"] }) {
  switch (icon) {
    case "shield":
      return <Shield aria-hidden="true" />;
    case "lock":
      return <Lock aria-hidden="true" />;
    case "eye":
      return <Eye aria-hidden="true" />;
    default:
      return <FileCheck aria-hidden="true" />;
  }
}

function GitHubMarkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 .297C5.373.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
        0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755
        -1.089-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998
        .108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22
        -.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405
        1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176
        .765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22
        0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297
        24 5.67 18.627.297 12 .297Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FooterQuickIcon({ icon }: { icon: (typeof footerQuickLinks)[number]["icon"] }) {
  switch (icon) {
    case "github":
      return <GitHubMarkIcon />;
    case "telegram":
      return <Send aria-hidden="true" />;
    case "status":
      return <Activity aria-hidden="true" />;
    default:
      return <BookOpen aria-hidden="true" />;
  }
}

function AnimatedCounter({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const { ref, isVisible } = useReveal<HTMLDivElement>();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let frame = 0;
    const duration = 1800;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, value]);

  return (
    <div ref={ref} className="landing-metric-value">
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </div>
  );
}

function DesktopNavLinks() {
  return (
    <div className="landing-nav-links" aria-label="首页分区导航">
      {landingNavLinks.map((link) => (
        <a key={link.href} href={link.href} className="landing-nav-link">
          {link.label}
        </a>
      ))}
    </div>
  );
}

function ThemeIcon({ theme }: { theme: "dark" | "light" }) {
  return theme === "dark" ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />;
}

function Navigation({ onToggleTheme, theme }: { onToggleTheme: () => void; theme: "dark" | "light" }) {
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

          <DesktopNavLinks />

          <div className="landing-nav-actions">
            <ButtonLink size="sm" to="/login" variant="secondary">
              登录
            </ButtonLink>
            <ButtonLink size="sm" to="/register" variant="primary">
              注册
            </ButtonLink>
          </div>

          <Button
            aria-controls={isCompactNavigation ? "landing-mobile-menu" : undefined}
            aria-expanded={isCompactNavigation ? isMobileMenuOpen : undefined}
            aria-label={isCompactNavigation ? "切换菜单" : theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            iconOnly
            onClick={() => {
              if (isCompactNavigation) {
                setIsMobileMenuOpen((current) => !current);
                return;
              }
              onToggleTheme();
            }}
            size="sm"
            variant="icon"
          >
            {isCompactNavigation ? (isMobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />) : <ThemeIcon theme={theme} />}
          </Button>
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
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ ["--menu-delay" as string]: reducedMotion ? "0ms" : `${index * 70}ms` } as CSSProperties}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="landing-mobile-actions">
              <ButtonLink size="sm" to="/login" variant="secondary" onClick={() => setIsMobileMenuOpen(false)}>
                登录
              </ButtonLink>
              <ButtonLink size="sm" to="/register" variant="primary" onClick={() => setIsMobileMenuOpen(false)}>
                注册
              </ButtonLink>
              <Button
                fullWidth
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

function HeroSection() {
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex] = useAutoIndex(heroWords.length, 2500, reducedMotion);
  const currentWord = heroWords[wordIndex];

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="landing-hero-section" data-visible={isVisible}>
      <div className="landing-hero-orb" aria-hidden="true">
        <AnimatedSphere />
      </div>
      <div className="landing-hero-grid" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={`h-${index}`} className="landing-hero-grid-line horizontal" style={{ top: `${12.5 * (index + 1)}%` }} />
        ))}
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={`v-${index}`} className="landing-hero-grid-line vertical" style={{ left: `${8.33 * (index + 1)}%` }} />
        ))}
      </div>

      <div className="landing-hero-copy-shell">
        <div className="landing-hero-eyebrow-row">
          <SectionEyebrow>给现代团队的临时邮箱工作台</SectionEyebrow>
        </div>
        <h1 className="landing-hero-title">
          <span>把临时邮箱</span>
          <span>
            做成能
            <span className="landing-hero-word-wrap">
              <span className="landing-hero-word" key={currentWord}>
                {currentWord.split("").map((character, index) => (
                  <span key={`${currentWord}-${index}`} className="landing-hero-char" style={{ animationDelay: `${index * 55}ms` }}>
                    {character}
                  </span>
                ))}
              </span>
              <span className="landing-hero-word-underline" aria-hidden="true" />
            </span>
            的系统
          </span>
        </h1>

        <div className="landing-hero-bottom">
          <p className="landing-hero-description">为 QA、运营、客服和内部自动化提供统一工作台，在同一界面完成收件、解析、外发与权限治理。</p>
          <div className="landing-cta-row">
            <ButtonLink size="lg" to="/register" trailingIcon={<ArrowRight aria-hidden="true" />} variant="primary">
              立即开始
            </ButtonLink>
            <ButtonLink size="lg" to="/login" variant="secondary">
              进入登录
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="landing-stats-marquee" aria-label="平台能力摘要">
        <div className="landing-marquee-track">
          {Array.from({ length: 2 }).flatMap((_, loopIndex) =>
            heroStats.map((stat) => (
              <article className="landing-stat-chip" key={`${stat.company}-${loopIndex}`}>
                <strong>{stat.value}</strong>
                <span>
                  {stat.label}
                  <em>{stat.company}</em>
                </span>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="landing-scroll-cue" aria-hidden="true">
        <span className="landing-scroll-line" />
        <span className="landing-scroll-label">SCROLL</span>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <RevealSection id="features" className="landing-section landing-section-border-top">
      <div className="landing-section-header left">
        <SectionEyebrow>核心能力</SectionEyebrow>
        <h2 className="landing-display-title">收件、提取、外发、治理，一页打通。</h2>
        <p className="landing-section-copy">
          WeMail 把收件箱创建、消息审阅、外发记录与运营控制放进同一个产品界面，而不是散落在脚本、浏览器标签页和人工流程里。
        </p>
      </div>
      <div className="landing-features-grid">
        {featureCards.map((feature) => (
          <article className="landing-feature-card-next" key={feature.number}>
            <div className="landing-feature-meta">
              <span>{feature.number}</span>
              <div className="landing-feature-visual">
                <FeatureVisual type={feature.visual} />
              </div>
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </RevealSection>
  );
}

function HowItWorksSection() {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useAutoIndex(workflowSteps.length, 5000, reducedMotion);

  return (
    <RevealSection id="how-it-works" className="landing-section landing-section-dark">
      <div className="landing-section-header left on-dark">
        <SectionEyebrow>使用流程</SectionEyebrow>
        <h2 className="landing-display-title">
          三步上线。
          <br />
          <span className="landing-display-subtle">把临时邮箱纳入你的工作流。</span>
        </h2>
      </div>
      <div className="landing-process-layout">
        <div className="landing-process-steps">
          {workflowSteps.map((step, index) => (
            <Button
              key={step.number}
              className={activeStep === index ? "landing-process-step active" : "landing-process-step"}
              contentLayout="plain"
              isActive={activeStep === index}
              onClick={() => setActiveStep(index)}
              variant="text"
            >
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {activeStep === index ? <em className="landing-process-progress" aria-hidden="true" /> : null}
              </div>
            </Button>
          ))}
        </div>
        <AnimatedCodeBlock code={workflowSteps[activeStep]?.code ?? ""} fileLabel="workflow.ts" statusLabel="已就绪" dark />
      </div>
    </RevealSection>
  );
}

function InfrastructureSection() {
  const reducedMotion = useReducedMotion();
  const [activeLocation] = useAutoIndex(infrastructureLocations.length, 2200, reducedMotion);

  return (
    <RevealSection id="infrastructure" className="landing-section">
      <div className="landing-two-column">
        <div>
          <SectionEyebrow>基础设施</SectionEyebrow>
          <h2 className="landing-display-title">部署一次，边缘运行。</h2>
          <p className="landing-section-copy">
            基于 Workers、Pages、D1 与 R2 的组合，把收件、附件、控制台和治理逻辑放在同一套可演进的基础设施语义里。
          </p>
          <div className="landing-kpi-row">
            <article>
              <strong>1 套</strong>
              <span>统一控制面</span>
            </article>
            <article>
              <strong>4 层</strong>
              <span>核心基础设施</span>
            </article>
            <article>
              <strong>全天候</strong>
              <span>面向自动化工作流</span>
            </article>
          </div>
        </div>
        <div className="landing-network-panel">
          <div className="landing-network-panel-header">
            <span>基础设施</span>
            <span className="landing-network-status">
              <i aria-hidden="true" />
              全部在线
            </span>
          </div>
          <div className="landing-location-board">
            {infrastructureLocations.map((location, index) => (
              <article className={index === activeLocation ? "landing-location-card active" : "landing-location-card"} key={location.city}>
                <div className="landing-location-card-main">
                  <span className="landing-location-dot" aria-hidden="true" />
                  <div>
                    <strong>{location.city}</strong>
                    <span>{location.region}</span>
                  </div>
                </div>
                <em>{location.latency}</em>
              </article>
            ))}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function MetricsSection() {
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <RevealSection id="metrics" className="landing-section landing-section-border-top">
      <div className="landing-section-header centered">
        <SectionEyebrow centered>关键指标</SectionEyebrow>
        <h2 className="landing-display-title">和团队节奏一起运转的数字。</h2>
      </div>
      <div className="landing-metrics-grid">
        {metrics.map((metric) => (
          <article className="landing-metric-card" key={metric.label}>
            <AnimatedCounter value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
            <p>{metric.label}</p>
          </article>
        ))}
      </div>
      <p className="landing-clock">实时快照 · {time}</p>
    </RevealSection>
  );
}

function IntegrationsSection() {
  return (
    <RevealSection id="integrations" className="landing-section">
      <div className="landing-section-header centered">
        <SectionEyebrow centered>系统协同</SectionEyebrow>
        <h2 className="landing-display-title">和你已经在用的系统自然接上。</h2>
        <p className="landing-section-copy">把临时邮箱流程接到团队现有的通知、自动化和发布控制链路里，而不是额外再维护一套孤岛工具。</p>
      </div>
      <div className="landing-marquee-list">
        <div className="landing-marquee-track">
          {Array.from({ length: 2 }).flatMap((_, loopIndex) =>
            integrations.map((integration) => (
              <article className="landing-integration-card" key={`${integration.name}-${loopIndex}`}>
                <strong>{integration.name}</strong>
                <span>{integration.category}</span>
              </article>
            ))
          )}
        </div>
      </div>
      <div className="landing-marquee-list reverse">
        <div className="landing-marquee-track reverse">
          {Array.from({ length: 2 }).flatMap((_, loopIndex) =>
            [...integrations].reverse().map((integration) => (
              <article className="landing-integration-card" key={`${integration.name}-reverse-${loopIndex}`}>
                <strong>{integration.name}</strong>
                <span>{integration.category}</span>
              </article>
            ))
          )}
        </div>
      </div>
    </RevealSection>
  );
}

function SecuritySection() {
  return (
    <RevealSection id="security" className="landing-section landing-section-muted">
      <div className="landing-two-column security">
        <div>
          <SectionEyebrow>治理与安全</SectionEyebrow>
          <h2 className="landing-display-title">不是能跑就够，必须可控。</h2>
          <p className="landing-section-copy">
            邀请注册、额度策略和收件箱监管让这套系统适合真实团队长期使用，而不是很快演变成无人治理的公共邮箱池。
          </p>
          <div className="landing-pill-list">
            {certifications.map((certification) => (
              <span key={certification}>{certification}</span>
            ))}
          </div>
        </div>
        <div className="landing-security-grid">
          {securityCards.map((card) => (
            <article className="landing-security-card" key={card.title}>
              <span className="landing-security-icon">
                <SecurityIcon icon={card.icon} />
              </span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function DevelopersSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedTab, setCopiedTab] = useState<number | null>(null);

  useEffect(() => {
    if (copiedTab === null) return;
    const timeout = window.setTimeout(() => setCopiedTab(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedTab]);

  async function copyActiveSnippet() {
    const snippet = developerTabs[activeTab]?.code;
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedTab(activeTab);
    } catch {
      setCopiedTab(null);
    }
  }

  return (
    <RevealSection id="developers" className="landing-section landing-section-border-top">
      <div className="landing-two-column developers">
        <div>
          <SectionEyebrow>开发接入</SectionEyebrow>
          <h2 className="landing-display-title">给动作快的工程团队准备。</h2>
          <p className="landing-section-copy">
            从接入到上线都尽量直接，不把能力藏进厚重平台里；你既能快速写脚本，也能让运营同学看懂同一套数据。
          </p>
          <div className="landing-developer-features">
            {developerFeatures.map((feature) => (
              <article className="landing-developer-feature" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="landing-developer-panel">
          <div className="landing-code-tabs">
            <div className="landing-code-tab-switch" role="tablist" aria-label="开发示例">
              {developerTabs.map((tab, index) => (
                <Button
                  key={tab.label}
                  aria-selected={index === activeTab}
                  className={index === activeTab ? "active" : ""}
                  isActive={index === activeTab}
                  onClick={() => setActiveTab(index)}
                  role="tab"
                  size="sm"
                  variant="pill"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
            <Button
              className="landing-code-copy"
              leadingIcon={copiedTab === activeTab ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              onClick={() => void copyActiveSnippet()}
              size="sm"
              variant="secondary"
            >
              {copiedTab === activeTab ? "已复制" : "复制"}
            </Button>
          </div>
          <AnimatedCodeBlock code={developerTabs[activeTab]?.code ?? ""} fileLabel="api-snippet.ts" statusLabel="可直接接入" />
          <div className="landing-code-links">
            <a href="#pricing">查看可用方案</a>
            <span aria-hidden="true">|</span>
            <a href="#features">回到能力概览</a>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function TestimonialsSection() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useAutoIndex(testimonials.length, 5000, reducedMotion);
  const activeTestimonial = testimonials[activeIndex];

  return (
    <RevealSection id="testimonials" className="landing-section landing-section-border-top landing-testimonials-section">
      <div className="landing-testimonial-header">
        <SectionEyebrow>团队反馈</SectionEyebrow>
        <span>
          {String(activeIndex + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
        </span>
      </div>
      <div className="landing-testimonial-grid">
        <blockquote>
          <p>“{activeTestimonial.quote}”</p>
          <div className="landing-testimonial-author">
            <div className="landing-testimonial-avatar">{activeTestimonial.author.charAt(0)}</div>
            <div>
              <strong>{activeTestimonial.author}</strong>
              <span>
                {activeTestimonial.role}，{activeTestimonial.company}
              </span>
            </div>
          </div>
        </blockquote>
        <aside>
          <div className="landing-testimonial-metric">
            <span>关键结果</span>
            <p>{activeTestimonial.metric}</p>
          </div>
          <div className="landing-testimonial-pills">
            {testimonials.map((testimonial, index) => (
              <Button
                key={testimonial.author}
                aria-label={`切换到第 ${index + 1} 条评价`}
                className={index === activeIndex ? "active" : ""}
                iconOnly
                isActive={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                size="xs"
                variant="pill"
              />
            ))}
          </div>
        </aside>
      </div>
      <div className="landing-trusted-band">
        <p>被高频协作团队持续使用</p>
      </div>
      <div className="landing-trusted-marquee">
        <div className="landing-marquee-track">
          {Array.from({ length: 2 }).flatMap((_, index) =>
            trustedCompanies.map((company) => (
              <span className="landing-trusted-company" key={`${company}-${index}`}>
                {company}
              </span>
            ))
          )}
        </div>
      </div>
    </RevealSection>
  );
}

function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <RevealSection id="pricing" className="landing-section landing-section-border-top landing-pricing-section">
      <div className="landing-pricing-header">
        <span className="landing-pricing-kicker">方案价格</span>
        <h2 className="landing-pricing-title">
          简单、透明
          <br />
          <span className="landing-display-subtle stroke">按需扩展</span>
        </h2>
        <p className="landing-pricing-copy">先把流程跑通，再随着团队协作深度逐步升级。不做藏起来的费用，也不把复杂度前置给你。</p>
      </div>
      <div className="landing-pricing-toggle-row">
        <div className="landing-billing-toggle pricing optimus">
          <span className={!isAnnual ? "active" : ""}>按月</span>
          <Switch
            aria-label={isAnnual ? "切换到按月计费" : "切换到按年计费"}
            checked={isAnnual}
            onChange={setIsAnnual}
          />
          <span className={isAnnual ? "active" : ""}>按年</span>
          {isAnnual ? <small>年付省 17%</small> : null}
        </div>
      </div>
      <div className="landing-pricing-grid lines optimus">
        {pricingPlans.map((plan, index) => (
          <article className={plan.popular ? "landing-pricing-card popular" : "landing-pricing-card"} key={plan.name}>
            {plan.popular ? <p className="landing-pricing-badge">推荐方案</p> : null}
            <span className="landing-pricing-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="landing-pricing-card-head">
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
            </div>
            <div className="landing-pricing-value">
              {plan.price.monthly === null ? (
                <span>定制</span>
              ) : (
                <>
                  <strong>${isAnnual ? plan.price.annual : plan.price.monthly}</strong>
                  <small>/月</small>
                </>
              )}
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              className={plan.popular ? "landing-pricing-cta primary" : "landing-pricing-cta secondary"}
              size="lg"
              to={plan.popular ? "/register" : "/login"}
              trailingIcon={<ArrowRight aria-hidden="true" />}
              variant={plan.popular ? "primary" : "secondary"}
            >
              {plan.cta}
            </ButtonLink>
          </article>
        ))}
      </div>
      <p className="landing-pricing-note">
        所有方案都包含自动更新、HTTPS 与基础防护能力。<a href="#developers">查看全部能力</a>
      </p>
    </RevealSection>
  );
}

function CtaSection() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  }

  return (
    <RevealSection className="landing-section landing-section-cta">
      <div className="landing-cta-panel" onMouseMove={handleMouseMove}>
        <div
          aria-hidden="true"
          className="landing-cta-spotlight"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 40%)`
          }}
        />
        <div>
          <h2 className="landing-display-title">准备把临时邮箱接入你的系统？</h2>
          <p className="landing-section-copy">先从测试、活动上线或运营协作开始，再逐步打开团队真正需要的治理能力，不必一开始就背上沉重平台成本。</p>
          <div className="landing-cta-row">
            <ButtonLink size="lg" to="/register" trailingIcon={<ArrowRight aria-hidden="true" />} variant="primary">
              受邀注册
            </ButtonLink>
            <ButtonLink size="lg" to="/login" variant="secondary">
              进入登录
            </ButtonLink>
          </div>
        </div>
        <div className="landing-cta-visual" aria-hidden="true">
          <AnimatedTetrahedron />
        </div>
        <div aria-hidden="true" className="landing-cta-corner landing-cta-corner-top" />
        <div aria-hidden="true" className="landing-cta-corner landing-cta-corner-bottom" />
      </div>
    </RevealSection>
  );
}

function FooterSection() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-wave" aria-hidden="true">
        <AnimatedWave />
      </div>
      <div className="landing-footer-grid">
        <div className="landing-footer-brand">
          <Link aria-label="WeMail 首页" className="landing-brand footer" to="/">
            <WemailBrandLockup className="landing-brand-lockup footer" label="WeMail footer brand lockup" />
          </Link>
        </div>
        <div className="landing-footer-quick-grid">
          {footerQuickLinks.map((link) => (
            <a
              className="landing-footer-quick-card"
              href={link.href}
              key={link.name}
              data-icon={link.icon}
              aria-label={link.name}
              title={link.name}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
            >
              <FooterQuickIcon icon={link.icon} />
              <span className="landing-visually-hidden">{link.name}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="landing-footer-bottom">
        <p>2026 WeMail. 版权所有。</p>
        <span>
          <i aria-hidden="true" />
          系统运行正常
        </span>
      </div>
    </footer>
  );
}

export function WemailLandingPage({
  onToggleTheme,
  theme
}: {
  onToggleTheme: () => void;
  theme: "dark" | "light";
}) {
  return (
    <div className="landing-page noise-overlay">
      <Navigation onToggleTheme={onToggleTheme} theme={theme} />
      <main className="landing-page-main">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <InfrastructureSection />
        <MetricsSection />
        <IntegrationsSection />
        <SecuritySection />
        <DevelopersSection />
        <TestimonialsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
