import {
  BookOpen,
  Braces,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Layers3,
  MailCheck,
  Settings2,
  ShieldCheck,
  Webhook
} from "lucide-react";

import { WEMAIL_VERSION_LABEL } from "@wemail/shared";

import { ButtonAnchor, ButtonLink } from "../shared/button";
import { Page, PageHeader } from "../shared/page-layout";
import { WemailBrandLockup } from "../shared/WemailBrandLockup";

const productProof = [
  {
    label: "当前版本",
    value: WEMAIL_VERSION_LABEL,
    detail: "稳定工作台体验",
    icon: CheckCircle2
  },
  {
    label: "运行环境",
    value: "Cloudflare Workers",
    detail: "边缘侧承接邮件链路",
    icon: Cloud
  },
  {
    label: "数据层",
    value: "D1 + R2",
    detail: "消息与对象分层存储",
    icon: Database
  },
  {
    label: "集成方式",
    value: "API + Webhook",
    detail: "对接自动化与通知系统",
    icon: Webhook
  }
];

const boundaryFlow = [
  {
    title: "外部渠道",
    description: "注册验证、测试链路、活动收件和协作入口",
    icon: Globe2
  },
  {
    title: "隔离地址",
    description: "按角色、域名和配额创建可控邮箱",
    icon: MailCheck
  },
  {
    title: "治理工作台",
    description: "消息、账号、发件和操作边界集中管理",
    icon: ShieldCheck
  },
  {
    title: "集成出口",
    description: "通过 API、Webhook 和 Telegram 进入团队流程",
    icon: Webhook
  }
];

const audienceSegments = [
  {
    title: "产品与增长团队",
    description: "用独立地址承接活动、注册、外部试用和客户沟通，减少真实团队邮箱暴露。",
    icon: MailCheck
  },
  {
    title: "开发与测试团队",
    description: "把收件、出站、Webhook 和 API 密钥放进同一套可复现的测试与集成流程。",
    icon: Layers3
  },
  {
    title: "管理员与安全负责人",
    description: "围绕角色、域名、配额和停用策略治理邮箱资产，让一次性地址也可审计。",
    icon: KeyRound
  }
];

const operatingPrinciples = [
  {
    label: "01",
    title: "最小暴露",
    description: "每个外部场景优先使用独立邮箱，真实团队身份和长期邮箱不直接进入不可控渠道。"
  },
  {
    label: "02",
    title: "治理先行",
    description: "账号创建、发件能力、停用删除和批量操作都保留清晰边界，先可控再开放。"
  },
  {
    label: "03",
    title: "边缘可靠",
    description: "基于 Cloudflare Workers、D1 与 R2 运行，优先保证部署简单、访问稳定和全球可用。"
  },
  {
    label: "04",
    title: "开放接入",
    description: "文档、API、Webhook 和通知通道默认服务团队协作，而不是把关键配置留在个人脚本里。"
  }
];

const resourceLinks = [
  {
    title: "产品文档",
    description: "上手指南、API 密钥、Webhook 接入、Telegram 通知和部署配置。",
    action: (
      <ButtonAnchor
        href="https://doc.wemail.willxue.com"
        leadingIcon={<BookOpen aria-hidden="true" />}
        rel="noopener noreferrer"
        size="sm"
        target="_blank"
        trailingIcon={<ExternalLink aria-hidden="true" />}
        variant="secondary"
      >
        打开产品文档
      </ButtonAnchor>
    )
  },
  {
    title: "设计系统",
    description: "组件规范、页面结构、可访问性示例和当前工作台的视觉语言。",
    action: (
      <ButtonLink leadingIcon={<Braces aria-hidden="true" />} size="sm" to="/design-system" variant="secondary">
        查看设计系统
      </ButtonLink>
    )
  },
  {
    title: "运行支持",
    description: "排查邮件链路、域名配置、Worker 部署和系统策略的入口。",
    action: (
      <ButtonLink
        leadingIcon={<Settings2 absoluteStrokeWidth aria-hidden="true" strokeWidth={1.9} />}
        size="sm"
        to="/system/settings"
        variant="secondary"
      >
        系统设置
      </ButtonLink>
    )
  }
];

function AboutSectionHeading({
  description,
  kicker,
  title
}: {
  description: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="about-section-heading">
      <p className="panel-kicker">{kicker}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function AboutPage() {
  return (
    <Page as="main" className="workspace-grid profile-settings-grid about-page">
      <section className="panel workspace-card page-panel profile-settings-panel about-hero-panel">
        <div className="about-hero-layout">
          <div className="about-hero-copy">
            <WemailBrandLockup className="about-brand-lockup" detail="trusted mail boundary" label="WeMail" />
            <PageHeader
              description="WeMail 是团队与外部世界之间的可信邮件边界：用一次性邮箱隔离风险，用工作台沉淀治理，用开放集成把邮件流接回团队系统。"
              kicker="关于我们"
              title="把一次性邮箱变成团队可治理的邮件边界"
            />
            <div className="about-hero-actions">
              <ButtonAnchor
                href="https://doc.wemail.willxue.com"
                leadingIcon={<BookOpen aria-hidden="true" />}
                rel="noopener noreferrer"
                size="sm"
                target="_blank"
                trailingIcon={<ExternalLink aria-hidden="true" />}
                variant="secondary"
              >
                阅读产品文档
              </ButtonAnchor>
              <ButtonLink
                leadingIcon={<LayoutDashboard absoluteStrokeWidth aria-hidden="true" strokeWidth={1.9} />}
                size="sm"
                to="/dashboard"
                variant="secondary"
              >
                返回仪表盘
              </ButtonLink>
            </div>
          </div>

          <div className="about-boundary-card" aria-label="WeMail 邮件边界流程" role="group">
            <div className="about-boundary-top">
              <WemailBrandLockup compact detail={null} label="WeMail" />
              <span className="about-boundary-status">
                <ShieldCheck aria-hidden="true" />
                可控收件链路
              </span>
            </div>

            <ol className="about-boundary-flow" aria-label="邮件边界流程">
              {boundaryFlow.map((item) => {
                const Icon = item.icon;

                return (
                  <li className="about-boundary-step" key={item.title}>
                    <span className="about-boundary-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="about-boundary-copy">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <ul className="about-proof-grid" aria-label="产品可信证明">
          {productProof.map((item) => {
            const Icon = item.icon;

            return (
              <li className="about-proof-item" key={item.label}>
                <span className="about-proof-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="about-proof-copy">
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                  <span>{item.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel workspace-card page-panel profile-settings-panel about-section">
        <AboutSectionHeading
          description="Creative Production 的定位路线落在“可信邮件边界”：面向需要频繁接触外部渠道的团队，承诺更少暴露、更清楚的责任链和更顺手的集成。"
          kicker="产品定位"
          title="我们为谁而建"
        />

        <div className="about-audience-grid">
          {audienceSegments.map((item) => {
            const Icon = item.icon;

            return (
              <article className="about-audience-item" key={item.title}>
                <span className="about-item-icon" aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel workspace-card page-panel profile-settings-panel about-section about-principles-section">
        <div className="about-principles-layout">
          <AboutSectionHeading
            description="页面、接口和后台策略都围绕可控、可追踪、可恢复来设计。"
            kicker="工作方式"
            title="我们的构建原则"
          />

          <div className="about-principle-list">
            {operatingPrinciples.map((item) => (
              <div className="about-principle-row" key={item.title}>
                <span className="about-principle-index">{item.label}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel workspace-card page-panel profile-settings-panel about-section">
        <AboutSectionHeading
          description="常用入口集中在这里，便于管理员、开发者和设计维护者快速跳转。"
          kicker="资源"
          title="文档与支持"
        />

        <div className="about-resource-list">
          {resourceLinks.map((item) => (
            <div className="about-resource-row" key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
              <div className="about-resource-action">{item.action}</div>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
