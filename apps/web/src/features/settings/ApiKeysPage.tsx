import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  KeyRound,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
  type LucideIcon
} from "lucide-react";

import {
  API_KEY_SCOPE_DEFINITIONS,
  DEFAULT_API_KEY_SCOPES,
  type ApiKeyScope,
  type ApiKeySummary,
  type UserRole
} from "@wemail/shared";
import { Button } from "../../shared/button";
import { Checkbox, FormField, TextInput } from "../../shared/form";
import { MetricCard } from "../../shared/metric-card";
import { OverlayDialog } from "../../shared/overlay";
import { Pagination } from "../../shared/pagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shared/tooltip";

type CreateApiKeyResult = {
  key: {
    secret: string;
    prefix: string;
    scopes: ApiKeyScope[];
  };
};

type ApiKeysPageProps = {
  apiKeys: ApiKeySummary[];
  currentUserRole?: UserRole;
  onCreateApiKey: (label: string, scopes: ApiKeyScope[]) => Promise<CreateApiKeyResult>;
  onRevokeApiKey: (keyId: string) => Promise<void>;
};

type RevealState = {
  label: string;
  prefix: string;
  scopes: ApiKeyScope[];
  secret: string;
};

type ApiKeysCodeBlockProps = {
  copied: boolean;
  copyLabel: string;
  label: string;
  onCopy: () => void;
  value: string;
};

const API_KEYS_PAGE_SIZE = 5;
const API_KEYS_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
const defaultCreateScopes = [...DEFAULT_API_KEY_SCOPES] as ApiKeyScope[];
const ADMIN_AUTOMATION_SCOPE: ApiKeyScope = "admin:automation";
const scopeLabelById = new Map<ApiKeyScope, string>(
  API_KEY_SCOPE_DEFINITIONS.map((scope) => [scope.id as ApiKeyScope, scope.label])
);

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

function formatScopeLabel(scope: ApiKeyScope) {
  return scopeLabelById.get(scope) ?? scope;
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(text);
}

function ApiKeysCodeBlock({ copied, copyLabel, label, onCopy, value }: ApiKeysCodeBlockProps) {
  return (
    <div className="integration-code-block api-keys-code-block">
      <span className="api-keys-code-label">{label}</span>
      <div className="api-keys-code-surface">
        <pre><code>{value}</code></pre>
        <Tooltip>
          <TooltipTrigger
            aria-label={copyLabel}
            className={`ui-button ui-button-icon ui-button-size-sm ui-button-icon-only api-keys-code-copy-trigger${copied ? " is-copied" : ""}`}
            onClick={onCopy}
          >
            <span className="ui-button-icon-slot" aria-hidden="true">
              {copied ? <CheckCircle2 size={15} strokeWidth={1.9} /> : <Copy size={15} strokeWidth={1.9} />}
            </span>
          </TooltipTrigger>
          <TooltipContent>{copied ? "已复制" : copyLabel}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function ApiKeysPage({ apiKeys, currentUserRole = "member", onCreateApiKey, onRevokeApiKey }: ApiKeysPageProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExampleOpen, setIsExampleOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(defaultCreateScopes);
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
      const payload = await onCreateApiKey(nextLabel, selectedScopes);
      setRevealState({
        label: nextLabel,
        prefix: payload.key.prefix,
        scopes: payload.key.scopes,
        secret: payload.key.secret
      });
      setLabel("");
      setSelectedScopes(defaultCreateScopes);
      setIsCreateOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setLabel("");
    setSelectedScopes(defaultCreateScopes);
  };

  const handleToggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((currentScopes) =>
      currentScopes.includes(scope)
        ? currentScopes.filter((currentScope) => currentScope !== scope)
        : [...currentScopes, scope]
    );
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
  const createScopeDefinitions = API_KEY_SCOPE_DEFINITIONS.filter(
    (scope) => currentUserRole === "admin" || scope.id !== ADMIN_AUTOMATION_SCOPE
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
          <p className="panel-kicker">API密钥</p>
          <h1 className="sr-only">API 密钥</h1>
        </div>
        <div className="api-keys-hero-actions">
          <div className="api-keys-live-chip" aria-label="活跃 API 密钥">
            <Activity aria-hidden="true" size={17} strokeWidth={1.9} />
            <span>{summary.activeKeys} 个活跃密钥</span>
          </div>
        </div>

        <section className="panel workspace-card page-panel integration-surface-card api-keys-terminal-card api-keys-top-terminal-card" aria-labelledby="api-keys-terminal-heading">
          <h2 className="sr-only" id="api-keys-terminal-heading">接入终端</h2>
          <button
            aria-controls="api-keys-terminal-body"
            aria-expanded={isExampleOpen}
            aria-label={isExampleOpen ? "收起调用示例" : "展开调用示例"}
            className="api-keys-terminal-toggle"
            onClick={() => setIsExampleOpen((current) => !current)}
            type="button"
          >
            <span className="api-keys-section-header">
              <span className="api-keys-section-icon" aria-hidden="true">
                <Terminal size={20} strokeWidth={1.8} />
              </span>
              <span className="integration-card-copy compact">
                <span className="panel-kicker">调用示例</span>
              </span>
            </span>
            <span className="api-keys-terminal-chevron" aria-hidden="true">
              <ChevronDown size={18} strokeWidth={2} />
            </span>
          </button>
          {isExampleOpen ? (
            <div className="api-keys-terminal-body" id="api-keys-terminal-body">
              <div className="api-keys-terminal-grid">
                <ApiKeysCodeBlock
                  copied={copiedToken === "authorization"}
                  copyLabel="复制 Authorization Header"
                  label="Authorization Header"
                  onCopy={() => void handleCopy("authorization", `Authorization: Bearer ${quickstartSecret}`)}
                  value={`Authorization: Bearer ${quickstartSecret}`}
                />
                <ApiKeysCodeBlock
                  copied={copiedToken === "curl"}
                  copyLabel="复制 curl 示例"
                  label="curl 示例"
                  onCopy={() => void handleCopy("curl", curlExample)}
                  value={curlExample}
                />
              </div>
            </div>
          ) : null}
        </section>

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
          <div className="api-keys-vault-header">
            <div className="api-keys-section-header">
              <span className="api-keys-section-icon" aria-hidden="true">
                <KeyRound size={20} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact">
                <p className="panel-kicker">凭证库</p>
                <h2 className="sr-only" id="api-keys-vault-heading">密钥清单</h2>
              </div>
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
                <small>权限：{revealState.scopes.map(formatScopeLabel).join("、")}</small>
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
                    <div className="api-keys-record-main">
                      <div className="api-keys-record-name-line">
                        <strong>{key.label}</strong>
                        <code>{key.prefix}</code>
                      </div>
                      <div className="api-keys-scope-list" aria-label={`${key.label} 权限范围`}>
                        {key.scopes.map((scope) => (
                          <span key={scope}>{formatScopeLabel(scope)}</span>
                        ))}
                      </div>
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
          <div className="api-keys-scope-picker" role="group" aria-label="API 密钥权限范围">
            {createScopeDefinitions.map((scope) => (
              <Checkbox
                checked={selectedScopes.includes(scope.id)}
                className="api-keys-scope-option"
                key={scope.id}
                label={
                  <span>
                  <strong>{scope.label}</strong>
                  <small>{scope.description}</small>
                  </span>
                }
                onChange={() => handleToggleScope(scope.id)}
              />
            ))}
          </div>
          <div className="workspace-dialog-actions integration-inline-actions">
            <Button onClick={handleCloseCreateDialog} variant="secondary">
              取消
            </Button>
            <Button
              disabled={isCreating || label.trim().length === 0 || selectedScopes.length === 0}
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
