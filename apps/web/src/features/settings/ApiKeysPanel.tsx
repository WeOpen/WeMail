import type { ApiKeySummary } from "@wemail/shared";

type ApiKeysPanelProps = {
  apiKeys: ApiKeySummary[];
  onCreateApiKey: (label: string) => Promise<void>;
  onRevokeApiKey: (keyId: string) => Promise<void>;
};

export function ApiKeysPanel({ apiKeys, onCreateApiKey, onRevokeApiKey }: ApiKeysPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">Automation</p>
      <h2>API keys</h2>
      <p className="section-copy">Provision keys for CLI tooling, scripts, and controlled integrations without leaving the workspace shell.</p>
      <button className="workspace-action-button primary" onClick={() => void onCreateApiKey(`CLI Key ${apiKeys.length + 1}`)} type="button">
        Generate key
      </button>
      <div className="stack-list workspace-stack-list">
        {apiKeys.map((key) => (
          <div key={key.id} className="stack-item admin-stack-item">
            <div>
              <strong>{key.label}</strong>
              <span>{key.prefix}</span>
            </div>
            <button className="workspace-action-button ghost" onClick={() => void onRevokeApiKey(key.id)} type="button">
              Revoke
            </button>
          </div>
        ))}
        {apiKeys.length === 0 ? <p className="empty-state">No automation credentials exist yet.</p> : null}
      </div>
    </section>
  );
}
