import type { FeatureToggles } from "@wemail/shared";

const featureLabels: Record<string, string> = {
  aiEnabled: "AI 提取",
  telegramEnabled: "Telegram 通知",
  outboundEnabled: "邮件外发",
  mailboxCreationEnabled: "邮箱创建"
};

type FeatureTogglesPanelProps = {
  adminFeatures: FeatureToggles | null;
  onToggleFeatures: (nextFeatureToggles: FeatureToggles) => Promise<void>;
};

export function FeatureTogglesPanel({
  adminFeatures,
  onToggleFeatures
}: FeatureTogglesPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">功能开关</p>
      <h2>系统开关</h2>
      <p className="section-copy">统一管理 AI、Telegram、外发与邮箱创建能力的启停状态。</p>
      {adminFeatures ? (
        <div className="toggle-grid workspace-toggle-grid">
          {Object.entries(adminFeatures).map(([key, value]) => (
            <label key={key} className="toggle-card">
              <input
                type="checkbox"
                checked={value}
                onChange={(event) =>
                  void onToggleFeatures({
                    ...adminFeatures,
                    [key]: event.target.checked
                  })
                }
              />
              <span>{featureLabels[key] ?? key}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="empty-state">当前环境没有可用的运行时开关。</p>
      )}
    </section>
  );
}
