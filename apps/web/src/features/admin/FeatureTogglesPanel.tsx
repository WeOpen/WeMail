import type { FeatureToggles } from "@wemail/shared";
import { Badge } from "../../shared/badge";
import { CheckboxField } from "../../shared/form";

const featureLabels: Record<string, string> = {
  aiEnabled: "AI 提取",
  telegramEnabled: "Telegram 通知",
  outboundEnabled: "邮件外发",
  mailboxCreationEnabled: "邮箱创建"
};

const featureDescriptions: Record<string, string> = {
  aiEnabled: "控制验证码、链接等内容的 AI 提取能力",
  telegramEnabled: "控制 Telegram 通知订阅与推送",
  outboundEnabled: "控制用户通过系统外发邮件",
  mailboxCreationEnabled: "控制成员创建新的收件邮箱"
};

type FeatureTogglesPanelProps = {
  adminFeatures: FeatureToggles | null;
  onToggleFeatures: (nextFeatureToggles: FeatureToggles) => Promise<void>;
};

export function FeatureTogglesPanel({
  adminFeatures,
  onToggleFeatures
}: FeatureTogglesPanelProps) {
  const enabledCount = adminFeatures ? Object.values(adminFeatures).filter(Boolean).length : 0;
  const totalCount = adminFeatures ? Object.keys(adminFeatures).length : 0;

  return (
    <section className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">功能开关</p>
          <h2>能力开关</h2>
          <p className="section-copy">统一管理 AI、Telegram、外发与邮箱创建能力的启停状态。</p>
        </div>
        {adminFeatures ? (
          <Badge className="users-feature-status-badge" variant={enabledCount === totalCount ? "success" : "warning"}>
            {enabledCount} / {totalCount} 启用
          </Badge>
        ) : null}
      </div>
      {adminFeatures ? (
        <div className="toggle-grid workspace-toggle-grid users-feature-toggle-grid">
          {Object.entries(adminFeatures).map(([key, value]) => (
            <CheckboxField
              checked={value}
              className="toggle-card"
              description={`${featureDescriptions[key] ?? "运行时能力"}，当前${value ? "启用" : "停用"}`}
              key={key}
              label={featureLabels[key] ?? key}
              onChange={(event) =>
                void onToggleFeatures({
                  ...adminFeatures,
                  [key]: event.target.checked
                })
              }
              variant="card"
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">当前环境没有可用的运行时开关。</p>
      )}
    </section>
  );
}
