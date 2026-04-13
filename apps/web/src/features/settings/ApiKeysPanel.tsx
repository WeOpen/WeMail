import type { ApiKeySummary } from "@wemail/shared";

type ApiKeysPanelProps = {
  apiKeys: ApiKeySummary[];
  onCreateApiKey: (label: string) => Promise<void>;
  onRevokeApiKey: (keyId: string) => Promise<void>;
};

export function ApiKeysPanel({ apiKeys, onCreateApiKey, onRevokeApiKey }: ApiKeysPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">自动化接入</p>
      <h2>API 密钥</h2>
      <p className="section-copy">为脚本、CLI 和外部系统创建访问凭证，无需离开当前工作台。</p>
      <button className="workspace-action-button primary" onClick={() => void onCreateApiKey(`自动化密钥 ${apiKeys.length + 1}`)} type="button">
        创建密钥
      </button>
      <div className="stack-list workspace-stack-list">
        {apiKeys.map((key) => (
          <div key={key.id} className="stack-item admin-stack-item">
            <div>
              <strong>{key.label}</strong>
              <span>{key.prefix}</span>
            </div>
            <button className="workspace-action-button ghost" onClick={() => void onRevokeApiKey(key.id)} type="button">
              吊销
            </button>
          </div>
        ))}
        {apiKeys.length === 0 ? <p className="empty-state">当前还没有自动化密钥。</p> : null}
      </div>
    </section>
  );
}
