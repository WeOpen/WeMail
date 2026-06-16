import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  MailCheck,
  PanelTopOpen,
  RadioTower,
  Route,
  Save,
  SendHorizontal,
  ShieldAlert,
  SlidersHorizontal,
  type LucideIcon
} from "lucide-react";
import {
  defaultMailSettings,
  mailSettingsOptions,
  type MailSettings,
  type MailSettingsRouting,
  type MailSettingsSenderRules,
  type MailSettingsWorkspaceDefaults,
  type TelegramOverviewSummary
} from "@wemail/shared";

import { Button } from "../../shared/button";
import { CheckboxField, FormField, SelectInput, TextInput, TextareaInput } from "../../shared/form";
import {
  fetchMailSettings,
  fetchTelegramOverview,
  fetchWebhookEndpoints,
  updateMailSettings,
  type WebhookEndpointSummary
} from "./api";

type SenderRulesState = MailSettingsSenderRules;
type RoutingState = MailSettingsRouting;
type WorkspaceDefaultsState = MailSettingsWorkspaceDefaults;

type MailSettingsPageProps = {
  canManageMailSettings?: boolean;
};

type OverviewTone = "accent" | "info" | "success" | "warning";

const options = mailSettingsOptions;
const emptyTelegramOverview: TelegramOverviewSummary = {
  botConfigured: false,
  canSendTest: false,
  featureEnabled: false,
  subscription: null,
  supportedEvents: []
};

function hasStateChanges<T>(draft: T, saved: T) {
  return JSON.stringify(draft) !== JSON.stringify(saved);
}

function formatSwitchState(value: boolean) {
  return value ? "开启" : "关闭";
}

function formatConfiguredValue(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function getEnabledWebhookEndpoints(endpoints: WebhookEndpointSummary[]) {
  return endpoints.filter((endpoint) => endpoint.enabled);
}

function getTelegramTarget(overview: TelegramOverviewSummary) {
  return overview.featureEnabled && overview.botConfigured && overview.subscription?.enabled ? overview.subscription : null;
}

function normalizeRoutingTargets(
  routing: MailSettingsRouting,
  webhookEndpoints: WebhookEndpointSummary[],
  telegramOverview: TelegramOverviewSummary
): MailSettingsRouting {
  const enabledWebhookEndpoints = getEnabledWebhookEndpoints(webhookEndpoints);
  const webhookEndpointMatch =
    enabledWebhookEndpoints.find((endpoint) => endpoint.id === routing.webhookEndpoint) ??
    enabledWebhookEndpoints.find((endpoint) => endpoint.url === routing.webhookEndpoint);
  const telegramTarget = getTelegramTarget(telegramOverview);

  return {
    ...routing,
    webhookEndpoint: webhookEndpointMatch?.id ?? enabledWebhookEndpoints[0]?.id ?? "",
    telegramTarget: telegramTarget ? telegramTarget.chatId : ""
  };
}

function formatLastUpdatedLabel(value: string) {
  if (value === "尚未更新" || value === "刚刚更新") return value;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "邮件设置同步失败，请稍后重试。";
}

export function MailSettingsPage({ canManageMailSettings = false }: MailSettingsPageProps) {
  const [senderDraft, setSenderDraft] = useState<SenderRulesState>({ ...defaultMailSettings.senderRules });
  const [senderSaved, setSenderSaved] = useState<SenderRulesState>({ ...defaultMailSettings.senderRules });
  const [routingDraft, setRoutingDraft] = useState<RoutingState>({ ...defaultMailSettings.routing });
  const [routingSaved, setRoutingSaved] = useState<RoutingState>({ ...defaultMailSettings.routing });
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDefaultsState>({ ...defaultMailSettings.workspaceDefaults });
  const [workspaceSaved, setWorkspaceSaved] = useState<WorkspaceDefaultsState>({ ...defaultMailSettings.workspaceDefaults });
  const [senderSavedNotice, setSenderSavedNotice] = useState(false);
  const [routingSavedNotice, setRoutingSavedNotice] = useState(false);
  const [workspaceSavedNotice, setWorkspaceSavedNotice] = useState(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>(defaultMailSettings.lastUpdatedLabel);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSender, setIsSavingSender] = useState(false);
  const [isSavingRouting, setIsSavingRouting] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpointSummary[]>([]);
  const [telegramOverview, setTelegramOverview] = useState<TelegramOverviewSummary>(emptyTelegramOverview);

  const applyMailSettings = useCallback(
    (
      settings: MailSettings,
      nextWebhookEndpoints: WebhookEndpointSummary[] = [],
      nextTelegramOverview: TelegramOverviewSummary = emptyTelegramOverview
    ) => {
      const routing = normalizeRoutingTargets(settings.routing, nextWebhookEndpoints, nextTelegramOverview);
      setSenderDraft({ ...settings.senderRules });
      setSenderSaved({ ...settings.senderRules });
      setRoutingDraft(routing);
      setRoutingSaved(routing);
      setWorkspaceDraft({ ...settings.workspaceDefaults });
      setWorkspaceSaved({ ...settings.workspaceDefaults });
      setLastUpdatedLabel(settings.lastUpdatedLabel);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSettings(true);
    void Promise.all([
      fetchMailSettings(),
      fetchWebhookEndpoints().catch(() => ({ endpoints: [] })),
      fetchTelegramOverview().catch(() => ({ overview: emptyTelegramOverview }))
    ])
      .then(([{ settings }, webhookPayload, telegramPayload]) => {
        if (cancelled) return;
        const nextWebhookEndpoints = webhookPayload.endpoints ?? [];
        const nextTelegramOverview = telegramPayload.overview ?? emptyTelegramOverview;
        setWebhookEndpoints(nextWebhookEndpoints);
        setTelegramOverview(nextTelegramOverview);
        applyMailSettings(settings, nextWebhookEndpoints, nextTelegramOverview);
        setSettingsError(null);
      })
      .catch((error) => {
        if (!cancelled) setSettingsError(readErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyMailSettings]);

  const defaultRouteLabel = useMemo(
    () => options.defaultMailRoutes.find((route) => route.value === workspaceSaved.defaultMailRoute)?.label ?? workspaceSaved.defaultMailRoute,
    [workspaceSaved.defaultMailRoute]
  );

  const channelStatus = useMemo(() => {
    if (routingSaved.webhookEnabled && routingSaved.telegramEnabled) return "Webhook + Telegram";
    if (routingSaved.webhookEnabled) return "仅 Webhook";
    if (routingSaved.telegramEnabled) return "仅 Telegram";
    return "全部关闭";
  }, [routingSaved.telegramEnabled, routingSaved.webhookEnabled]);

  const senderIdentityLabel = formatConfiguredValue(senderSaved.defaultIdentity, "未设置发件身份");
  const fallbackOwnerLabel = formatConfiguredValue(routingSaved.fallbackOwner, "未设置");
  const lastUpdatedDisplay = formatLastUpdatedLabel(lastUpdatedLabel);
  const enabledWebhookEndpoints = useMemo(() => getEnabledWebhookEndpoints(webhookEndpoints), [webhookEndpoints]);
  const telegramTarget = useMemo(() => getTelegramTarget(telegramOverview), [telegramOverview]);
  const hasSenderChanges = hasStateChanges(senderDraft, senderSaved);
  const hasRoutingChanges = hasStateChanges(routingDraft, routingSaved);
  const hasWorkspaceChanges = hasStateChanges(workspaceDraft, workspaceSaved);
  const isSettingsReadOnly = !canManageMailSettings;
  const areControlsDisabled = isSettingsReadOnly || isLoadingSettings;
  const pendingChangeCount = [hasSenderChanges, hasRoutingChanges, hasWorkspaceChanges].filter(Boolean).length;
  const activeRoutingCount = [
    routingSaved.webhookEnabled,
    routingSaved.telegramEnabled,
    routingSaved.failureAlerts,
    routingSaved.exceptionAlerts
  ].filter(Boolean).length;
  const overviewItems: Array<{
    detail: string;
    icon: LucideIcon;
    label: string;
    tone: OverviewTone;
    value: string;
  }> = [
    {
      detail: senderSaved.allowManualOverride ? "允许临时覆盖" : "固定身份",
      icon: SendHorizontal,
      label: "默认发件",
      tone: "accent",
      value: senderIdentityLabel
    },
    {
      detail: `${activeRoutingCount}/4 项策略开启`,
      icon: RadioTower,
      label: "通知通道",
      tone: "info",
      value: channelStatus
    },
    {
      detail: `列表密度：${workspaceSaved.listDensity}`,
      icon: PanelTopOpen,
      label: "默认入口",
      tone: "success",
      value: defaultRouteLabel
    },
    {
      detail: pendingChangeCount > 0 ? "需要保存后生效" : "全部已同步",
      icon: Clock3,
      label: "未保存变更",
      tone: pendingChangeCount > 0 ? "warning" : "success",
      value: `${pendingChangeCount} 项`
    }
  ];

  async function saveSenderRules() {
    if (!canManageMailSettings || !hasSenderChanges) return;
    setIsSavingSender(true);
    setSettingsError(null);
    setSenderSavedNotice(false);
    try {
      const { settings } = await updateMailSettings({ senderRules: senderDraft });
      applyMailSettings(settings);
      setSenderSavedNotice(true);
    } catch (error) {
      setSettingsError(readErrorMessage(error));
    } finally {
      setIsSavingSender(false);
    }
  }

  async function saveRoutingRules() {
    if (!canManageMailSettings || !hasRoutingChanges) return;
    setIsSavingRouting(true);
    setSettingsError(null);
    setRoutingSavedNotice(false);
    try {
      const { settings } = await updateMailSettings({ routing: routingDraft });
      applyMailSettings(settings, webhookEndpoints, telegramOverview);
      setRoutingSavedNotice(true);
    } catch (error) {
      setSettingsError(readErrorMessage(error));
    } finally {
      setIsSavingRouting(false);
    }
  }

  async function saveWorkspaceDefaults() {
    if (!canManageMailSettings || !hasWorkspaceChanges) return;
    setIsSavingWorkspace(true);
    setSettingsError(null);
    setWorkspaceSavedNotice(false);
    try {
      const { settings } = await updateMailSettings({ workspaceDefaults: workspaceDraft });
      applyMailSettings(settings);
      setWorkspaceSavedNotice(true);
    } catch (error) {
      setSettingsError(readErrorMessage(error));
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  return (
    <main aria-busy={isLoadingSettings} className="workspace-grid integration-page-grid mail-settings-page">
      <div className="integration-primary-column">
        <section className="panel workspace-card page-panel integration-surface-card mail-settings-intro-card">
          <div className="mail-settings-hero-layout">
            <div className="integration-card-copy mail-settings-hero-copy">
              <p className="panel-kicker">邮件中心</p>
              <h1>邮件设置</h1>
              <p className="section-copy">把发件身份、异常流转和工作台默认行为放在同一个策略面板里，便于值班与回归时快速确认。</p>
            </div>
            <div className="mail-settings-hero-status" aria-label="邮件策略状态">
              <span className="mail-settings-status-dot" data-state={pendingChangeCount > 0 ? "pending" : "synced"} />
              <div>
                <span>{pendingChangeCount > 0 ? "有未保存变更" : "策略已同步"}</span>
                <strong>{isLoadingSettings ? "正在加载" : lastUpdatedDisplay}</strong>
              </div>
            </div>
          </div>

          <div className="mail-settings-overview-grid" role="list" aria-label="邮件设置概览">
            {overviewItems.map((item) => {
              const OverviewIcon = item.icon;

              return (
                <div className="mail-settings-overview-tile" data-tone={item.tone} key={item.label} role="listitem">
                  <span className="mail-settings-overview-icon" aria-hidden="true">
                    <OverviewIcon size={18} strokeWidth={1.8} />
                  </span>
                  <span>{item.label}</span>
                  <strong title={item.value}>{item.value}</strong>
                  <small>{item.detail}</small>
                </div>
              );
            })}
          </div>
        </section>

        {settingsError ? (
          <p className="error-banner mail-settings-error-banner" role="alert">
            {settingsError}
          </p>
        ) : null}
        {isLoadingSettings ? (
          <p className="empty-state mail-settings-loading-state" role="status">
            正在加载邮件设置...
          </p>
        ) : null}
        {isSettingsReadOnly ? (
          <p className="mail-settings-readonly-banner" role="note">
            只有管理员可以修改邮件策略。当前账号可查看生效配置。
          </p>
        ) : null}

        <section className="panel workspace-card page-panel integration-surface-card mail-settings-section">
          <div className="mail-settings-section-header">
            <div className="mail-settings-section-title">
              <span className="mail-settings-section-icon" aria-hidden="true">
                <MailCheck size={19} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact">
                <p className="panel-kicker">规则优先</p>
                <h2>发件规则</h2>
                <p className="section-copy">控制默认发件身份、签名和失败重试策略，让测试、回归和值班发送保持一致。</p>
              </div>
            </div>
            <span className="mail-settings-dirty-pill" data-state={hasSenderChanges ? "dirty" : "clean"}>
              {hasSenderChanges ? "待保存" : "已同步"}
            </span>
          </div>

          <div className="mail-settings-field-grid">
            <div className="mail-settings-rule-grid">
              <FormField description="新建外发邮件时优先使用的身份。" label="默认发件身份">
                <TextInput
                  aria-label="默认发件身份"
                  disabled={areControlsDisabled}
                  onChange={(event) => {
                    setSenderDraft((current) => ({ ...current, defaultIdentity: event.target.value }));
                    setSenderSavedNotice(false);
                  }}
                  placeholder="WeMail <mail@your-domain.com>"
                  value={senderDraft.defaultIdentity}
                />
              </FormField>

              <FormField description="追加到默认外发邮件底部。" label="默认签名">
                <TextareaInput
                  aria-label="默认签名"
                  disabled={areControlsDisabled}
                  onChange={(event) => {
                    setSenderDraft((current) => ({ ...current, signature: event.target.value }));
                    setSenderSavedNotice(false);
                  }}
                  rows={5}
                  value={senderDraft.signature}
                />
              </FormField>
            </div>

            <div className="mail-settings-policy-panel">
              <div className="mail-settings-panel-title">
                <Clock3 size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>失败重试策略</span>
              </div>

              <div className="mail-settings-inline-grid">
                <FormField label="重试次数">
                  <SelectInput
                    aria-label="重试次数"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setSenderDraft((current) => ({ ...current, retryAttempts: event.target.value }));
                      setSenderSavedNotice(false);
                    }}
                    value={senderDraft.retryAttempts}
                  >
                    {options.retryAttempts.map((retryAttempts) => (
                      <option key={retryAttempts} value={retryAttempts}>
                        {retryAttempts}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField label="重试间隔">
                  <SelectInput
                    aria-label="重试间隔"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setSenderDraft((current) => ({ ...current, retryDelay: event.target.value }));
                      setSenderSavedNotice(false);
                    }}
                    value={senderDraft.retryDelay}
                  >
                    {options.retryDelays.map((retryDelay) => (
                      <option key={retryDelay} value={retryDelay}>
                        {retryDelay}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField label="失败记录保留">
                  <SelectInput
                    aria-label="失败记录保留"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setSenderDraft((current) => ({ ...current, failureRetention: event.target.value }));
                      setSenderSavedNotice(false);
                    }}
                    value={senderDraft.failureRetention}
                  >
                    {options.failureRetentions.map((failureRetention) => (
                      <option key={failureRetention} value={failureRetention}>
                        {failureRetention}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              </div>
            </div>

            <div className="toggle-grid mail-settings-toggle-grid">
              <CheckboxField
                aria-label="失败后自动重试"
                checked={senderDraft.retryEnabled}
                className="integration-detail-card mail-settings-toggle-card"
                description="按上方次数与间隔重新投递失败邮件。"
                disabled={areControlsDisabled}
                label="失败后自动重试"
                onChange={(event) => {
                  setSenderDraft((current) => ({ ...current, retryEnabled: event.target.checked }));
                  setSenderSavedNotice(false);
                }}
                variant="card"
              />
              <CheckboxField
                aria-label="允许临时覆盖发件身份"
                checked={senderDraft.allowManualOverride}
                className="integration-detail-card mail-settings-toggle-card"
                description="单封邮件可在发送前切换身份。"
                disabled={areControlsDisabled}
                label="允许临时覆盖发件身份"
                onChange={(event) => {
                  setSenderDraft((current) => ({ ...current, allowManualOverride: event.target.checked }));
                  setSenderSavedNotice(false);
                }}
                variant="card"
              />
            </div>
          </div>

          <div className="integration-inline-actions">
            <Button
              disabled={!canManageMailSettings || !hasSenderChanges || isLoadingSettings}
              isLoading={isSavingSender}
              leadingIcon={<Save size={16} strokeWidth={1.8} />}
              loadingLabel="保存中"
              onClick={() => void saveSenderRules()}
              variant="primary"
            >
              保存发件规则
            </Button>
            {senderSavedNotice ? <p className="mail-settings-save-notice" role="status">发件规则已保存</p> : null}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card mail-settings-section">
          <div className="mail-settings-section-header">
            <div className="mail-settings-section-title">
              <span className="mail-settings-section-icon" aria-hidden="true">
                <Route size={19} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact">
                <p className="panel-kicker">路由优先</p>
                <h2>通知与路由</h2>
                <p className="section-copy">集中定义 Webhook、Telegram、失败告警与异常 / 无匹配邮件的默认流转方式。</p>
              </div>
            </div>
            <span className="mail-settings-dirty-pill" data-state={hasRoutingChanges ? "dirty" : "clean"}>
              {hasRoutingChanges ? "待保存" : "已同步"}
            </span>
          </div>

          <div className="mail-settings-field-grid">
            <div className="toggle-grid mail-settings-toggle-grid mail-settings-toggle-grid-four">
              <CheckboxField
                aria-label="Webhook 通知"
                checked={routingDraft.webhookEnabled}
                className="integration-detail-card mail-settings-toggle-card"
                description="把邮件事件推送到团队系统。"
                disabled={areControlsDisabled}
                label="Webhook 通知"
                onChange={(event) => {
                  setRoutingDraft((current) => ({ ...current, webhookEnabled: event.target.checked }));
                  setRoutingSavedNotice(false);
                }}
                variant="card"
              />
              <CheckboxField
                aria-label="Telegram 通知"
                checked={routingDraft.telegramEnabled}
                className="integration-detail-card mail-settings-toggle-card"
                description="发送即时提醒到指定会话。"
                disabled={areControlsDisabled}
                label="Telegram 通知"
                onChange={(event) => {
                  setRoutingDraft((current) => ({ ...current, telegramEnabled: event.target.checked }));
                  setRoutingSavedNotice(false);
                }}
                variant="card"
              />
              <CheckboxField
                aria-label="失败告警"
                checked={routingDraft.failureAlerts}
                className="integration-detail-card mail-settings-toggle-card"
                description="投递失败时通知值班人。"
                disabled={areControlsDisabled}
                label="失败告警"
                onChange={(event) => {
                  setRoutingDraft((current) => ({ ...current, failureAlerts: event.target.checked }));
                  setRoutingSavedNotice(false);
                }}
                variant="card"
              />
              <CheckboxField
                aria-label="异常 / 无匹配提醒"
                checked={routingDraft.exceptionAlerts}
                className="integration-detail-card mail-settings-toggle-card"
                description="无匹配规则时保留提醒链路。"
                disabled={areControlsDisabled}
                label="异常 / 无匹配提醒"
                onChange={(event) => {
                  setRoutingDraft((current) => ({ ...current, exceptionAlerts: event.target.checked }));
                  setRoutingSavedNotice(false);
                }}
                variant="card"
              />
            </div>

            <div className="mail-settings-policy-panel">
              <div className="mail-settings-panel-title">
                <BellRing size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>通知目标</span>
              </div>

              <FormField description="从 Webhook 控制台已启用的端点中选择。" label="Webhook 端点">
                <SelectInput
                  aria-label="Webhook 端点"
                  disabled={areControlsDisabled || enabledWebhookEndpoints.length === 0}
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, webhookEndpoint: event.target.value }));
                    setRoutingSavedNotice(false);
                  }}
                  value={routingDraft.webhookEndpoint}
                >
                  {enabledWebhookEndpoints.length === 0 ? (
                    <option value="">暂无已启用 Webhook 端点</option>
                  ) : (
                    enabledWebhookEndpoints.map((endpoint) => (
                      <option key={endpoint.id} value={endpoint.id}>
                        {endpoint.name} · {endpoint.url}
                      </option>
                    ))
                  )}
                </SelectInput>
              </FormField>

              <div className="mail-settings-inline-grid mail-settings-target-grid">
                <FormField className="mail-settings-target-field" label="Telegram 目标">
                  <SelectInput
                    aria-label="Telegram 目标"
                    className="mail-settings-target-control"
                    disabled={areControlsDisabled || !telegramTarget}
                    onChange={(event) => {
                      setRoutingDraft((current) => ({ ...current, telegramTarget: event.target.value }));
                      setRoutingSavedNotice(false);
                    }}
                    value={routingDraft.telegramTarget}
                  >
                    {telegramTarget ? (
                      <option value={telegramTarget.chatId}>Chat {telegramTarget.chatId} · 已启用</option>
                    ) : (
                      <option value="">暂无已启用 Telegram 绑定</option>
                    )}
                  </SelectInput>
                </FormField>

                <FormField className="mail-settings-target-field" label="异常处理策略">
                  <SelectInput
                    aria-label="异常处理策略"
                    className="mail-settings-target-control"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setRoutingDraft((current) => ({ ...current, exceptionStrategy: event.target.value }));
                      setRoutingSavedNotice(false);
                    }}
                    value={routingDraft.exceptionStrategy}
                  >
                    {options.exceptionStrategies.map((exceptionStrategy) => (
                      <option key={exceptionStrategy} value={exceptionStrategy}>
                        {exceptionStrategy}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField className="mail-settings-target-field" label="异常归属">
                  <TextInput
                    aria-label="异常归属"
                    className="mail-settings-target-control"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setRoutingDraft((current) => ({ ...current, fallbackOwner: event.target.value }));
                      setRoutingSavedNotice(false);
                    }}
                    placeholder="例如：值班邮箱或团队名称"
                    value={routingDraft.fallbackOwner}
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div className="integration-inline-actions">
            <Button
              disabled={!canManageMailSettings || !hasRoutingChanges || isLoadingSettings}
              isLoading={isSavingRouting}
              leadingIcon={<Save size={16} strokeWidth={1.8} />}
              loadingLabel="保存中"
              onClick={() => void saveRoutingRules()}
              variant="primary"
            >
              保存通知与路由
            </Button>
            {routingSavedNotice ? <p className="mail-settings-save-notice" role="status">通知与路由已保存</p> : null}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card mail-settings-section">
          <div className="mail-settings-section-header">
            <div className="mail-settings-section-title">
              <span className="mail-settings-section-icon" aria-hidden="true">
                <SlidersHorizontal size={19} strokeWidth={1.8} />
              </span>
              <div className="integration-card-copy compact">
                <p className="panel-kicker">工作台偏好</p>
                <h2>工作台行为偏好</h2>
                <p className="section-copy">把默认进入位置、发件箱筛选和列表密度放在第三顺位，不抢前两块的注意力。</p>
              </div>
            </div>
            <span className="mail-settings-dirty-pill" data-state={hasWorkspaceChanges ? "dirty" : "clean"}>
              {hasWorkspaceChanges ? "待保存" : "已同步"}
            </span>
          </div>

          <div className="mail-settings-field-grid">
            <div className="mail-settings-policy-panel">
              <div className="mail-settings-panel-title">
                <PanelTopOpen size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>默认视图</span>
              </div>

              <div className="mail-settings-inline-grid">
                <FormField label="默认进入页面">
                  <SelectInput
                    aria-label="默认进入页面"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setWorkspaceDraft((current) => ({ ...current, defaultMailRoute: event.target.value }));
                      setWorkspaceSavedNotice(false);
                    }}
                    value={workspaceDraft.defaultMailRoute}
                  >
                    {options.defaultMailRoutes.map((route) => (
                      <option key={route.value} value={route.value}>
                        {route.label}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField label="发件箱默认筛选">
                  <SelectInput
                    aria-label="发件箱默认筛选"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setWorkspaceDraft((current) => ({ ...current, outboundDefaultFilter: event.target.value }));
                      setWorkspaceSavedNotice(false);
                    }}
                    value={workspaceDraft.outboundDefaultFilter}
                  >
                    {options.outboundDefaultFilters.map((filter) => (
                      <option key={filter} value={filter}>
                        {filter}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField label="列表密度">
                  <SelectInput
                    aria-label="列表密度"
                    disabled={areControlsDisabled}
                    onChange={(event) => {
                      setWorkspaceDraft((current) => ({ ...current, listDensity: event.target.value }));
                      setWorkspaceSavedNotice(false);
                    }}
                    value={workspaceDraft.listDensity}
                  >
                    {options.listDensities.map((density) => (
                      <option key={density} value={density}>
                        {density}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              </div>
            </div>

            <div className="toggle-grid mail-settings-toggle-grid">
              <CheckboxField
                aria-label="优先打开最近失败记录"
                checked={workspaceDraft.openLatestFailureFirst}
                className="integration-detail-card mail-settings-toggle-card"
                description="发件箱默认定位到最近失败项。"
                disabled={areControlsDisabled}
                label="优先打开最近失败记录"
                onChange={(event) => {
                  setWorkspaceDraft((current) => ({ ...current, openLatestFailureFirst: event.target.checked }));
                  setWorkspaceSavedNotice(false);
                }}
                variant="card"
              />
            </div>
          </div>

          <div className="integration-inline-actions">
            <Button
              disabled={!canManageMailSettings || !hasWorkspaceChanges || isLoadingSettings}
              isLoading={isSavingWorkspace}
              leadingIcon={<Save size={16} strokeWidth={1.8} />}
              loadingLabel="保存中"
              onClick={() => void saveWorkspaceDefaults()}
              variant="primary"
            >
              保存工作台偏好
            </Button>
            {workspaceSavedNotice ? <p className="mail-settings-save-notice" role="status">工作台偏好已保存</p> : null}
          </div>
        </section>
      </div>

      <aside aria-label="当前策略摘要" className="integration-secondary-column">
        <section className="panel workspace-card page-panel integration-side-card mail-settings-summary-card">
          <div className="mail-settings-summary-head">
            <span className="mail-settings-section-icon" aria-hidden="true">
              <ShieldAlert size={19} strokeWidth={1.8} />
            </span>
            <div>
              <p className="panel-kicker">策略摘要</p>
              <h2>当前策略摘要</h2>
            </div>
          </div>
          <div className="mail-settings-sync-banner" data-state={pendingChangeCount > 0 ? "pending" : "synced"}>
            {pendingChangeCount > 0 ? <Clock3 size={17} strokeWidth={1.8} /> : <CheckCircle2 size={17} strokeWidth={1.8} />}
            <span>{pendingChangeCount > 0 ? `${pendingChangeCount} 组设置待保存` : "当前策略已同步"}</span>
          </div>
          <dl className="mail-settings-summary-list">
            <div className="mail-settings-summary-row">
              <dt>默认发件身份</dt>
              <dd>{senderIdentityLabel}</dd>
            </div>
            <div className="mail-settings-summary-row">
              <dt>失败告警</dt>
              <dd>{formatSwitchState(routingSaved.failureAlerts)}</dd>
            </div>
            <div className="mail-settings-summary-row">
              <dt>Webhook / Telegram</dt>
              <dd>{channelStatus}</dd>
            </div>
            <div className="mail-settings-summary-row">
              <dt>异常邮件策略</dt>
              <dd>{routingSaved.exceptionStrategy}</dd>
            </div>
            <div className="mail-settings-summary-row">
              <dt>默认入口</dt>
              <dd>{defaultRouteLabel}</dd>
            </div>
            <div className="mail-settings-summary-row">
              <dt>最近更新时间</dt>
              <dd>{lastUpdatedDisplay}</dd>
            </div>
          </dl>

          <div className="mail-settings-flow-panel" aria-label="邮件策略链路">
            <p className="panel-kicker">策略链路</p>
            <ol>
              <li>
                <span>1</span>
                <strong>发件身份</strong>
                <small>{senderSaved.retryEnabled ? `${senderSaved.retryAttempts} · ${senderSaved.retryDelay}` : "不自动重试"}</small>
              </li>
              <li>
                <span>2</span>
                <strong>通知路由</strong>
                <small>{routingSaved.exceptionAlerts ? `${channelStatus} · ${fallbackOwnerLabel}` : channelStatus}</small>
              </li>
              <li>
                <span>3</span>
                <strong>工作台入口</strong>
                <small>{defaultRouteLabel}</small>
              </li>
            </ol>
          </div>
        </section>
      </aside>
    </main>
  );
}
