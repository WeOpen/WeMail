import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpenText,
  Cloud,
  Code2,
  FileText,
  Rocket,
  ShieldCheck,
} from "lucide-react";

const guideCards = [
  {
    href: "/docs/quickstart",
    title: "本地启动",
    description: "初始化本地 D1、生成邀请码，并同时启动 Web 与 Worker。",
    icon: BookOpenText,
  },
  {
    href: "/docs/cloudflare-resources",
    title: "Cloudflare 部署",
    description: "准备 D1、KV、Pages、Worker、Email Routing 和生产域名。",
    icon: Cloud,
  },
  {
    href: "/docs/github-actions",
    title: "发布流程",
    description: "通过 GitHub Actions 发布 staging，再从 main 发布 production。",
    icon: FileText,
  },
];

const stackItems = [
  { label: "Framework", value: "Next.js 16" },
  { label: "Docs", value: "Fumadocs MDX" },
  { label: "Search", value: "Local Orama" },
];

export default function HomePage() {
  return (
    <main className="docs-home">
      <header className="docs-home-nav-shell">
        <nav className="docs-home-nav" aria-label="文档站导航">
          <Link aria-label="WeMail Docs 首页" className="docs-home-brand" href="/">
            <Image
              alt=""
              aria-hidden="true"
              className="docs-home-brand-logo"
              height={44}
              priority
              src="/brand/WeMail-favicon.png"
              width={44}
            />
            <span className="docs-home-brand-copy">
              <strong>WeMail Docs</strong>
              <small>edge mail operations</small>
            </span>
          </Link>

          <div className="docs-home-nav-links" aria-label="文档导航">
            <Link href="/docs">文档</Link>
            <Link href="/docs/quickstart">本地启动</Link>
            <Link href="/docs/github-actions">发布</Link>
          </div>

          <div className="docs-home-nav-actions">
            <a
              aria-label="WeMail GitHub"
              className="docs-home-nav-icon"
              href="https://github.com/WeOpen/WeMail"
              rel="noreferrer noopener"
              target="_blank"
            >
              <svg aria-hidden="true" role="img" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                />
              </svg>
            </a>
            <Link className="docs-home-nav-primary" href="/docs">
              开始阅读
            </Link>
          </div>
        </nav>
      </header>

      <section className="docs-home-hero" aria-labelledby="docs-home-title">
        <div className="docs-home-grid" aria-hidden="true">
          <span className="docs-home-grid-line horizontal top" />
          <span className="docs-home-grid-line horizontal middle" />
          <span className="docs-home-grid-line vertical left" />
          <span className="docs-home-grid-line vertical right" />
        </div>

        <div className="docs-home-copy">
          <Image
            alt="WeMail envelope logo"
            className="docs-home-hero-logo"
            height={560}
            priority
            src="/brand/WeMail.png"
            width={560}
          />
          <h1 id="docs-home-title">WeMail 文档中心</h1>
          <p>
            WeMail Docs 面向开发、部署和运维，把 Cloudflare Worker、D1、R2、邮件路由和前端控制台的关键流程沉淀在一个独立文档站里。
          </p>
          <div className="docs-home-actions">
            <Link className="docs-home-primary-action" href="/docs">
              开始阅读
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="docs-home-secondary-action" href="/docs/cloudflare-resources">
              部署路线
            </Link>
          </div>
        </div>

        <aside className="docs-home-console" aria-label="WeMail documentation workspace">
          <div className="docs-home-console-header">
            <span className="docs-home-window-controls" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>apps/docs</span>
          </div>
          <div className="docs-home-console-body">
            <div className="docs-home-command">
              <Code2 aria-hidden="true" />
              <code>pnpm dev:docs</code>
            </div>
            <div className="docs-home-status-list">
              <span>
                <ShieldCheck aria-hidden="true" />
                Type-safe MDX routes
              </span>
              <span>
                <Rocket aria-hidden="true" />
                Standalone deploy ready
              </span>
            </div>
            <div className="docs-home-stack">
              {stackItems.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="docs-home-guides" aria-label="Documentation shortcuts">
        {guideCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link className="docs-home-guide-card" href={card.href} key={card.title}>
              <span className="docs-home-guide-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>
                <strong>{card.title}</strong>
                <small>{card.description}</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
