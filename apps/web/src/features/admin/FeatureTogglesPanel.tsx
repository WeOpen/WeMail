import type { FeatureToggles } from "@wemail/shared";

const featureLabels: Record<string, string> = {
  aiEnabled: "AI extraction",
  telegramEnabled: "Telegram relay",
  outboundEnabled: "Outbound mail",
  mailboxCreationEnabled: "Mailbox creation"
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
      <p className="panel-kicker">Feature switches</p>
      <h2>System flags</h2>
      <p className="section-copy">Flip runtime switches for AI, Telegram, outbound delivery, and mailbox creation with immediate feedback.</p>
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
        <p className="empty-state">No runtime flags are available in this environment.</p>
      )}
    </section>
  );
}
