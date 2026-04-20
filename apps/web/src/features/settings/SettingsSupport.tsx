import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type SettingsSupportCardProps = {
  kicker?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export function SettingsSupportCard({ kicker = "辅助说明", title, description, children }: SettingsSupportCardProps) {
  return (
    <section className="panel workspace-card page-panel integration-side-card">
      <div className="integration-card-copy">
        <p className="panel-kicker">{kicker}</p>
        <h3>{title}</h3>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

type IntegrationChoiceCardProps = {
  current: "webhook" | "telegram";
};

const integrationChoices = [
  {
    id: "api-keys",
    title: "主动调用 API",
    description: "脚本、CLI 或服务端任务需要主动请求 WeMail 时，使用 API 密钥。",
    to: "/api-keys"
  },
  {
    id: "webhook",
    title: "平台主动推事件",
    description: "当你希望 WeMail 把事件实时推送到自己的服务端点时，使用 Webhook。",
    to: "/webhook"
  },
  {
    id: "telegram",
    title: "个人即时提醒",
    description: "如果目标是把关键动态同步到自己的 Telegram，而不是系统集成，就用 Telegram。",
    to: "/telegram"
  }
] as const;

export function IntegrationChoiceCard({ current }: IntegrationChoiceCardProps) {
  return (
    <SettingsSupportCard
      kicker="接入方式"
      title="如何选择这三种接入"
      description="把“主动调 API / 系统推送 / 个人提醒”这三件事分开配置，会比把所有入口混在一个页面里更清晰。"
    >
      <div className="integration-choice-list">
        {integrationChoices.map((choice) => (
          <NavLink
            key={choice.id}
            className={`integration-choice-row${choice.id === current ? " current" : ""}`}
            to={choice.to}
          >
            <strong>{choice.title}</strong>
            <span>{choice.description}</span>
          </NavLink>
        ))}
      </div>
    </SettingsSupportCard>
  );
}
