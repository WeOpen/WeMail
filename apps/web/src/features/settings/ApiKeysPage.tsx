import { useEffect, useMemo, useState } from "react";
import { Ban, Clock3, KeyRound, ShieldCheck, type LucideIcon } from "lucide-react";

import type { ApiKeySummary } from "@wemail/shared";
import { Button } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";
import { MetricCard } from "../../shared/metric-card";

type CreateApiKeyResult = {
  key: {
    secret: string;
    prefix: string;
  };
};

type ApiKeysPageProps = {
  apiKeys: ApiKeySummary[];
  onCreateApiKey: (label: string) => Promise<CreateApiKeyResult>;
  onRevokeApiKey: (keyId: string) => Promise<void>;
};

type RevealState = {
  label: string;
  prefix: string;
  secret: string;
};

const API_KEYS_PAGE_SIZE = 5;

function formatDate(value: string | null) {
  if (!value) return "尚未使用";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getStatusLabel(key: ApiKeySummary) {
  if (key.revokedAt) return "已失效";
  if (!key.lastUsedAt) return "未使用";
  return "可用";
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(text);
}

export function ApiKeysPage({ apiKeys, onCreateApiKey, onRevokeApiKey }: ApiKeysPageProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [revealState, setRevealState] = useState<RevealState | null>(null);

  const summary = useMemo(() => {
    const activeKeys = apiKeys.filter((key) => !key.revokedAt);
    const unusedKeys = activeKeys.filter((key) => !key.lastUsedAt).length;
    const revokedKeys = apiKeys.length - activeKeys.length;
    return {
      totalKeys: apiKeys.length,
      activeKeys: activeKeys.length,
      unusedKeys,
      revokedKeys
    };
  }, [apiKeys]);

  const quickstartSecret = revealState?.secret ?? "<your-api-key>";
  const curlExample = `curl https://api.example.com/messages \\\n  -H "Authorization: Bearer ${quickstartSecret}"`;

  const handleCreate = async () => {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    setIsCreating(true);
    try {
      const payload = await onCreateApiKey(nextLabel);
      setRevealState({
        label: nextLabel,
        prefix: payload.key.prefix,
        secret: payload.key.secret
      });
      setLabel("");
      setIsCreateOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (typeof window !== "undefined" && !window.confirm("吊销后，所有依赖该密钥的脚本都会立即失效。确认继续吗？")) {
      return;
    }
    setPendingRevokeId(keyId);
    try {
      await onRevokeApiKey(keyId);
    } finally {
      setPendingRevokeId(null);
    }
  };

  const handleCopy = async (token: string, text: string) => {
    await copyText(text);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1500);
  };

  const totalPages = Math.max(1, Math.ceil(apiKeys.length / API_KEYS_PAGE_SIZE));
  const currentSafePage = Math.min(currentPage, totalPages);
  const paginatedApiKeys = apiKeys.slice(
    (currentSafePage - 1) * API_KEYS_PAGE_SIZE,
    currentSafePage * API_KEYS_PAGE_SIZE
  );
  const pageStart = apiKeys.length === 0 ? 0 : (currentSafePage - 1) * API_KEYS_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentSafePage * API_KEYS_PAGE_SIZE, apiKeys.length);
  const statCards: Array<{
    detail: string;
    icon: LucideIcon;
    kicker: string;
    value: number;
  }> = [
    { detail: "总数", icon: KeyRound, kicker: "总密钥", value: summary.totalKeys },
    { detail: "可用", icon: ShieldCheck, kicker: "活跃密钥", value: summary.activeKeys },
    { detail: "未使用", icon: Clock3, kicker: "从未使用", value: summary.unusedKeys },
    { detail: "失效", icon: Ban, kicker: "已吊销", value: summary.revokedKeys }
  ];

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <main className="workspace-grid api-keys-layout-grid">
      <section className="api-keys-top-stats" aria-label="API 密钥状态概览">
        {statCards.map((card) => {
          const StatIcon = card.icon;
          return (
            <MetricCard
              className="panel workspace-card dashboard-kpi-card api-keys-stat-card"
              detail={card.detail}
              key={card.kicker}
              kicker={card.kicker}
              title=""
              value={card.value}
              valueSize="lg"
              visualIcon={<StatIcon absoluteStrokeWidth aria-hidden="true" strokeWidth={1.7} />}
            />
          );
        })}
      </section>

      <div className="api-keys-content-grid">
        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="workspace-card-header">
            <div className="integration-card-copy api-keys-primary-head">
              <p className="panel-kicker">个人凭证</p>
              <h2 className="sr-only">API 密钥</h2>
              <p className="section-copy sr-only">
                创建并管理用于访问 WeMail API 的个人凭证。适用于脚本、CLI、自动化任务和外部系统接入。
              </p>
            </div>
            <Button className="api-keys-create-button" onClick={() => setIsCreateOpen(true)} variant="primary">
              创建密钥
            </Button>
          </div>

          {isCreateOpen ? (
            <section className="integration-inline-composer" aria-label="创建 API 密钥">
              <div className="integration-card-copy compact">
                <p className="panel-kicker">创建流程</p>
                <h3>创建新的 API 密钥</h3>
                <p className="section-copy">为不同用途命名不同密钥，后续排查与吊销时会更清晰。</p>
              </div>
              <FormField className="integration-form-grid" htmlFor="api-key-label" label="密钥名称">
                <TextInput
                  id="api-key-label"
                  name="label"
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="例如：个人 CLI / 本地脚本 / 自动化工作流"
                  value={label}
                />
              </FormField>
              <div className="workspace-dialog-actions integration-inline-actions">
                <Button onClick={() => setIsCreateOpen(false)} variant="secondary">
                  取消
                </Button>
                <Button
                  disabled={isCreating || label.trim().length === 0}
                  onClick={() => void handleCreate()}
                  variant="primary"
                >
                  {isCreating ? "创建中..." : "确认创建"}
                </Button>
              </div>
            </section>
          ) : null}

          {revealState ? (
            <section className="integration-highlight-card" aria-live="polite">
              <div className="integration-card-copy compact">
                <p className="panel-kicker">已创建</p>
                <h3>新密钥已生成</h3>
                <p className="section-copy">出于安全原因，这个密钥只会显示一次，请立即复制并安全保存。</p>
              </div>
              <div className="integration-secret-block">
                <strong>{revealState.label}</strong>
                <code>{revealState.secret}</code>
                <small>前缀：{revealState.prefix}</small>
              </div>
              <div className="integration-inline-actions">
                <Button onClick={() => void handleCopy("secret", revealState.secret)} variant="primary">
                  {copiedToken === "secret" ? "已复制密钥" : "复制密钥"}
                </Button>
                <Button onClick={() => setRevealState(null)} variant="secondary">
                  我已安全保存
                </Button>
              </div>
            </section>
          ) : null}

          {apiKeys.length > 0 ? (
            <div className="integration-record-list" role="list">
              {paginatedApiKeys.map((key) => (
                <article className="integration-record-row" key={key.id} role="listitem">
                  <div className="integration-record-copy">
                    <strong>{key.label}</strong>
                    <span>{key.prefix}</span>
                  </div>
                  <div className="integration-record-meta">
                    <small>创建于 {formatDate(key.createdAt)}</small>
                    <small>最近使用：{formatDate(key.lastUsedAt)}</small>
                  </div>
                  <span className="integration-status-pill">{getStatusLabel(key)}</span>
                  <div className="integration-inline-actions">
                    <Button
                      disabled={Boolean(key.revokedAt) || pendingRevokeId === key.id}
                      onClick={() => void handleRevoke(key.id)}
                      variant="secondary"
                    >
                      {key.revokedAt ? "已吊销" : pendingRevokeId === key.id ? "吊销中..." : "吊销"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="integration-empty-state">
              <strong>创建你的第一个 API 密钥</strong>
              <p className="section-copy">创建后，你可以通过脚本、CLI 或外部系统安全地访问 WeMail API。</p>
            </div>
          )}

          {apiKeys.length > API_KEYS_PAGE_SIZE ? (
            <nav className="api-keys-pagination" aria-label="API 密钥分页">
              <span>
                {pageStart}-{pageEnd} / {apiKeys.length}
              </span>
              <div className="integration-inline-actions">
                <Button
                  disabled={currentSafePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  size="sm"
                  variant="secondary"
                >
                  上一页
                </Button>
                <Button
                  disabled={currentSafePage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  size="sm"
                  variant="secondary"
                >
                  下一页
                </Button>
              </div>
            </nav>
          ) : null}
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy api-keys-quickstart-head">
            <p className="panel-kicker">快速开始</p>
            <h3 className="sr-only">快速开始</h3>
            <p className="section-copy">把 API 密钥放到 Authorization Header 中，即可用最熟悉的 HTTP 方式访问受保护接口。</p>
          </div>
          <div className="integration-code-block">
            <span>Authorization Header</span>
            <pre>{`Authorization: Bearer ${quickstartSecret}`}</pre>
          </div>
          <div className="integration-code-block">
            <span>curl 示例</span>
            <pre>{curlExample}</pre>
          </div>
          <div className="integration-inline-actions">
            <Button onClick={() => void handleCopy("curl", curlExample)} variant="primary">
              {copiedToken === "curl" ? "已复制代码" : "复制代码"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
