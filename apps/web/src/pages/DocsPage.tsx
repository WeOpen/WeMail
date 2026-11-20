import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ButtonLink } from "../shared/button";
import "./docs.css";

// Vite emits each guide as a separate chunk; loading the workspace does not
// download or parse the documentation corpus or its Markdown renderer.
const documents = import.meta.glob("../../../docs/content/docs/*.mdx", { query: "?raw", import: "default" });
const screenshots = import.meta.glob("../../../docs/public/docs/screenshots/*.png", { query: "?url", import: "default", eager: true }) as Record<string, string>;

const guides = [
  { title: "用 API 取得验证码", description: "创建只读密钥，按邮箱和时间读取新验证码。", file: "api-verification-code", to: "/api-keys", action: "创建 API 密钥" },
  { title: "推送聊天平台", description: "绑定 Telegram 或聊天 Webhook，确认真实消息和重试结果。", file: "chat-notifications", to: "/webhook", action: "配置通知" },
  { title: "用自己的域名接收邮件", description: "串起域名、Email Routing、秘密配置与清理调度。", file: "self-hosted-domain", to: "/mail/list", action: "开始首封邮件" }
];

export function DocsPage() {
  const { slug } = useParams();
  const [content, setContent] = useState<{ slug: string; title: string; body: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let isStale = false;
    setLoadError(null);
    if (slug) {
      const load = documents[`../../../docs/content/docs/${slug}.mdx`];
      if (!load) setLoadError("没有找到这篇指南。");
      else void load().then((raw) => {
        if (isStale) return;
        const text = String(raw);
        setContent({ slug, title: text.match(/^title:\s*(.+)$/m)?.[1] ?? "使用指南", body: text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "") });
      }).catch(() => { if (!isStale) setLoadError("指南加载失败，请刷新重试。"); });
    }
    return () => { isStale = true; };
  }, [slug]);

  useEffect(() => {
    if (content?.slug !== slug || !window.location.hash) return;
    let fragment: string;
    try {
      fragment = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    document.getElementById(fragment)?.scrollIntoView();
  }, [content, slug]);

  if (slug) return (
    <main className="workspace-grid">
      <article className="panel workspace-card page-panel docs-article">
        <ButtonLink to="/docs" variant="text">全部指南</ButtonLink>
        {loadError ? <p role="alert">{loadError}</p> : content?.slug !== slug ? <p role="status">正在加载指南…</p> : <>
          <h1>{content.title}</h1>
          <Markdown skipHtml remarkPlugins={[remarkGfm]} components={{
            a: ({ href, children }) => href?.startsWith("/docs/") ? <Link to={href}>{children}</Link> : <a href={href} rel="noreferrer">{children}</a>,
            img: ({ src, alt }) => <img src={screenshots[`../../../docs/public${src}`] ?? src} alt={alt ?? ""} loading="lazy" />,
            h2: ({ children }) => <h2 id={String(children).toLowerCase().replace(/^\d+\.\s*/, "").replace(/\s+/g, "-")}>{children}</h2>
          }}>{content.body}</Markdown>
        </>}
      </article>
    </main>
  );

  return (
    <main className="workspace-grid">
      <section className="panel workspace-card page-panel workspace-placeholder-panel">
        <h1>使用指南</h1>
        <div className="workspace-placeholder-card-grid">
          {guides.map((guide) => (
            <article className="workspace-placeholder-card" key={guide.file}>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <ButtonLink to={`/docs/${guide.file}`} size="sm" variant="secondary">阅读步骤</ButtonLink>
              <ButtonLink size="sm" to={guide.to} variant="text">{guide.action}</ButtonLink>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
