import { ButtonAnchor } from "../shared/button";

export function AboutPage() {
  return (
    <main className="workspace-grid profile-settings-grid">
      <section className="panel workspace-card page-panel profile-settings-panel">
        <div className="profile-settings-copy">
          <p className="panel-kicker">关于我们</p>
          <h2>WeMail</h2>
          <p className="section-copy">
            WeMail 是一款面向团队的一次性邮件服务，帮助你快速创建、管理和销毁临时邮箱，保护真实邮件地址不被滥用。基于
            Cloudflare Workers 构建，零冷启动、全球低延迟。
          </p>
        </div>

        <div className="profile-meta-grid">
          <div className="profile-meta-card">
            <small>当前版本</small>
            <strong>1.0.0</strong>
          </div>
          <div className="profile-meta-card">
            <small>运行环境</small>
            <strong>Cloudflare Workers</strong>
          </div>
          <div className="profile-meta-card">
            <small>数据库</small>
            <strong>Cloudflare D1</strong>
          </div>
          <div className="profile-meta-card">
            <small>存储</small>
            <strong>Cloudflare R2</strong>
          </div>
        </div>
      </section>

      <section className="panel workspace-card page-panel profile-settings-panel">
        <div className="profile-settings-copy">
          <p className="panel-kicker">资源</p>
          <h2>文档与支持</h2>
          <p className="section-copy">查阅完整的产品文档、API 参考和上手指南。</p>
        </div>

        <div className="profile-security-list">
          <div className="profile-security-row">
            <strong>产品文档</strong>
            <span>包含快速上手、API 密钥配置、Webhook 接入和 Telegram 通知等完整指南。</span>
            <ButtonAnchor
              href="https://doc.wemail.willxue.com"
              rel="noopener noreferrer"
              size="sm"
              style={{ display: "inline-block", marginTop: "0.75rem", textDecoration: "none" }}
              target="_blank"
              variant="primary"
            >
              打开文档
            </ButtonAnchor>
          </div>
        </div>
      </section>
    </main>
  );
}
