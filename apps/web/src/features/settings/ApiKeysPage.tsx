import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  ListChecks,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
  type LucideIcon
} from "lucide-react";

import type { ApiKeySummary } from "@wemail/shared";
import { Button } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";
import { MetricCard } from "../../shared/metric-card";
import { OverlayDialog } from "../../shared/overlay";
import { Pagination } from "../../shared/pagination";

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
const API_KEYS_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

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

function getStatusTone(key: ApiKeySummary) {
  if (key.revokedAt) return "revoked";
  if (!key.lastUsedAt) return "idle";
  return "active";
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
  const [pageSize, setPageSize] = useState(API_KEYS_PAGE_SIZE);
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

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setLabel("");
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(apiKeys.length / pageSize));
  const currentSafePage = Math.min(currentPage, totalPages);
  const paginatedApiKeys = apiKeys.slice(
    (currentSafePage - 1) * pageSize,
    currentSafePage * pageSize
  );
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
    <>
    <main className="workspace-grid api-keys-layout-grid">
      <section className="panel workspace-card page-panel api-keys-hero-card">
        <div className="api-keys-hero-copy">
          <p className="panel-kicker">凭证安全</p>
          <h1>API 密钥</h1>
          <p className="section-copy">
            管理脚本、CLI 和外部系统访问 WeMail API 的个人凭证。创建后只展示一次，后续通过前缀、状态和使用时间来追踪。
          </p>
        </div>
        <div className="api-keys-hero-actions">
          <div className="api-keys-live-chip" aria-label="活跃 API 密钥">
            <Activity aria-hidden="true" size={17} strokeWidth={1.9} />
            <span>{summary.activeKeys} 个活跃密钥</span>
          </div>
          <Button
            className="api-keys-create-button"
            leadingIcon={<Plus size={16} strokeWidth={2} />}
            onClick={() => setIsCreateOpen(true)}
            variant="primary"
          >
            创建密钥
          </Button>
        </div>

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
      </section>

      <div className="api-keys-credential-grid">
        <section className="panel workspace-card page-panel integration-surface-card api-keys-vault-card" aria-labelledby="api-keys-vault-heading">
          <div className="api-keys-section-header">
            <span className="api-keys-section-icon" aria-hidden="true">
              <KeyRound size={20} strokeWidth={1.8} />
            </span>
            <div className="integration-card-copy compact">
              <p className="panel-kicker">凭证库</p>
              <h2 id="api-keys-vault-heading">密钥清单</h2>
              <p className="section-copy">用用途命名密钥，按前缀定位依赖方；不在列表内展示完整 secret。</p>
            </div>
          </div>

          {revealState ? (
            <section className="integration-highlight-card api-keys-reveal-card" aria-live="polite">
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
                <Button
                  leadingIcon={<Copy size={15} strokeWidth={1.9} />}
                  onClick={() => void handleCopy("secret", revealState.secret)}
                  variant="primary"
                >
                  {copiedToken === "secret" ? "已复制密钥" : "复制密钥"}
                </Button>
                <Button leadingIcon={<CheckCircle2 size={15} strokeWidth={1.9} />} onClick={() => setRevealState(null)} variant="secondary">
                  我已安全保存
                </Button>
              </div>
            </section>
          ) : null}

          {apiKeys.length > 0 ? (
            <div className="api-keys-record-list" role="list">
              {paginatedApiKeys.map((key) => (
                <article className="api-keys-record-row" data-state={getStatusTone(key)} key={key.id} role="listitem">
                  <div className="api-keys-record-identity">
                    <span className="api-keys-record-icon" aria-hidden="true">
                      <KeyRound size={18} strokeWidth={1.8} />
                    </span>
                    <div>
                      <strong>{key.label}</strong>
                      <code>{key.prefix}</code>
                    </div>
                  </div>
                  <dl className="api-keys-record-meta">
                    <div>
                      <dt>创建时间</dt>
                      <dd>{formatDate(key.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>最近使用</dt>
                      <dd>{formatDate(key.lastUsedAt)}</dd>
                    </div>
                  </dl>
                  <span className="integration-status-pill api-keys-status-pill" data-state={getStatusTone(key)}>
                    {getStatusLabel(key)}
                  </span>
                  <div className="api-keys-row-actions">
                    <Button
                      disabled={Boolean(key.revokedAt) || pendingRevokeId === key.id}
                      isLoading={pendingRevokeId === key.id}
                      leadingIcon={<Trash2 size={15} strokeWidth={1.9} />}
                      loadingLabel="吊销中"
                      onClick={() => void handleRevoke(key.id)}
                      size="sm"
                      variant={key.revokedAt ? "secondary" : "danger"}
                    >
                      {key.revokedAt ? "已吊销" : "吊销"}
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

          {apiKeys.length > 0 ? (
            <Pagination
              aria-label="API 密钥分页"
              className="users-list-pagination api-keys-pagination"
              onChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              page={currentSafePage}
              pageSize={pageSize}
              pageSizeOptions={API_KEYS_PAGE_SIZE_OPTIONS}
              total={apiKeys.length}
            />
          ) : null}
        </section>

        <aside className="api-keys-side-rail">
          <section className="panel workspace-card page-panel integration-surface-card api-keys-terminal-card" aria-labelledby="api-keys-terminal-heading">
            <div className="api-keys-section-header">
              <span className="api-keys-section-icon" aria-hidden="true">
                <Terminal size={20} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact">
                <p className="panel-kicker">调用示例</p>
                <h2 id="api-keys-terminal-heading">接入终端</h2>
                <p className="section-copy">把密钥放到 Authorization Header 中，用同一套方式接入脚本和服务端任务。</p>
              </div>
            </div>
            <div className="integration-code-block api-keys-code-block">
              <span>Authorization Header</span>
              <pre>{`Authorization: Bearer ${quickstartSecret}`}</pre>
            </div>
            <div className="integration-code-block api-keys-code-block">
              <span>curl 示例</span>
              <pre>{curlExample}</pre>
            </div>
            <div className="integration-inline-actions">
              <Button leadingIcon={<Copy size={15} strokeWidth={1.9} />} onClick={() => void handleCopy("curl", curlExample)} variant="primary">
                {copiedToken === "curl" ? "已复制代码" : "复制代码"}
              </Button>
            </div>
          </section>

          <section className="panel workspace-card page-panel integration-surface-card api-keys-lifecycle-card" aria-labelledby="api-keys-lifecycle-heading">
            <div className="api-keys-section-header">
              <span className="api-keys-section-icon" aria-hidden="true">
                <ListChecks size={20} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact">
                <p className="panel-kicker">安全节奏</p>
                <h2 id="api-keys-lifecycle-heading">密钥生命周期</h2>
              </div>
            </div>
            <ol className="api-keys-lifecycle-list">
              <li>
                <span>1</span>
                <div>
                  <strong>创建后立即复制</strong>
                  <p>完整密钥只在生成后展示一次，关闭提示后不可再次查看。</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>按用途拆分</strong>
                  <p>为 CLI、CI、外部系统分别命名，排查时可以直接定位依赖方。</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>异常时吊销</strong>
                  <p>吊销会立即让使用该密钥的脚本失效，适合泄露或退役场景。</p>
                </div>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </main>

    {isCreateOpen ? (
      <OverlayDialog
        closeLabel="关闭创建 API 密钥"
        eyebrow="凭证创建"
        onClose={handleCloseCreateDialog}
        size="sm"
        title="创建 API 密钥"
      >
        <>
          <p className="section-copy">为不同用途命名不同密钥，后续排查与吊销时会更清晰。</p>
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
            <Button onClick={handleCloseCreateDialog} variant="secondary">
              取消
            </Button>
            <Button
              disabled={isCreating || label.trim().length === 0}
              isLoading={isCreating}
              loadingLabel="创建中"
              onClick={() => void handleCreate()}
              variant="primary"
            >
              确认创建
            </Button>
          </div>
        </>
      </OverlayDialog>
    ) : null}
    </>
  );
}
