import { useMemo, useState } from "react";

import { mailSettingsMockData } from "./mailSettingsMockData";

type SenderRulesState = {
  defaultIdentity: string;
  signature: string;
  retryEnabled: boolean;
  retryAttempts: string;
  retryDelay: string;
  failureRetention: string;
  allowManualOverride: boolean;
};

type RoutingState = {
  webhookEnabled: boolean;
  webhookEndpoint: string;
  telegramEnabled: boolean;
  telegramTarget: string;
  failureAlerts: boolean;
  exceptionAlerts: boolean;
  exceptionStrategy: string;
  fallbackOwner: string;
};

type WorkspaceDefaultsState = {
  defaultMailRoute: string;
  outboundDefaultFilter: string;
  expandExceptionsByDefault: boolean;
  listDensity: string;
  openLatestFailureFirst: boolean;
};

const { options } = mailSettingsMockData;

export function MailSettingsPage() {
  const [senderDraft, setSenderDraft] = useState<SenderRulesState>({ ...mailSettingsMockData.senderRules });
  const [senderSaved, setSenderSaved] = useState<SenderRulesState>({ ...mailSettingsMockData.senderRules });
  const [routingDraft, setRoutingDraft] = useState<RoutingState>({ ...mailSettingsMockData.routing });
  const [routingSaved, setRoutingSaved] = useState<RoutingState>({ ...mailSettingsMockData.routing });
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDefaultsState>({ ...mailSettingsMockData.workspaceDefaults });
  const [workspaceSaved, setWorkspaceSaved] = useState<WorkspaceDefaultsState>({ ...mailSettingsMockData.workspaceDefaults });
  const [senderSavedNotice, setSenderSavedNotice] = useState(false);
  const [routingSavedNotice, setRoutingSavedNotice] = useState(false);
  const [workspaceSavedNotice, setWorkspaceSavedNotice] = useState(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>(mailSettingsMockData.lastUpdatedLabel);

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

  function markUpdated() {
    setLastUpdatedLabel("刚刚更新");
  }

  function saveSenderRules() {
    setSenderSaved({ ...senderDraft });
    setSenderSavedNotice(true);
    markUpdated();
  }

  function saveRoutingRules() {
    setRoutingSaved({ ...routingDraft });
    setRoutingSavedNotice(true);
    markUpdated();
  }

  function saveWorkspaceDefaults() {
    setWorkspaceSaved({ ...workspaceDraft });
    setWorkspaceSavedNotice(true);
    markUpdated();
  }

  return (
    <main className="workspace-grid integration-page-grid mail-settings-page">
      <div className="integration-primary-column">
        <section className="panel workspace-card page-panel integration-surface-card mail-settings-intro-card">
          <div className="workspace-card-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">邮件中心</p>
              <h1>邮件设置</h1>
              <p className="section-copy">先锁定默认发件规则，再定义通知与路由策略，最后补充邮件工作台的默认行为。</p>
            </div>
          </div>
          <div className="integration-highlight-card mail-settings-highlight-card">
            <strong>本页先以 mock-first 方式固化邮件控制中心结构</strong>
            <span>第一屏优先展示发件规则与告警/路由，避免把“邮件设置”做成跳去其他页面的中转站。</span>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card mail-settings-section">
          <div className="integration-card-copy compact">
            <p className="panel-kicker">规则优先</p>
            <h2>发件规则</h2>
            <p className="section-copy">控制默认发件身份、签名和失败重试策略，让测试、回归和值班发送保持一致。</p>
          </div>

          <div className="mail-settings-field-grid">
            <label>
              默认发件身份
              <select
                aria-label="默认发件身份"
                onChange={(event) => {
                  setSenderDraft((current) => ({ ...current, defaultIdentity: event.target.value }));
                  setSenderSavedNotice(false);
                }}
                value={senderDraft.defaultIdentity}
              >
                {options.senderIdentities.map((identity) => (
                  <option key={identity} value={identity}>
                    {identity}
                  </option>
                ))}
              </select>
            </label>

            <label>
              默认签名
              <textarea
                aria-label="默认签名"
                onChange={(event) => {
                  setSenderDraft((current) => ({ ...current, signature: event.target.value }));
                  setSenderSavedNotice(false);
                }}
                rows={3}
                value={senderDraft.signature}
              />
            </label>

            <div className="mail-settings-inline-grid">
              <label>
                重试次数
                <select
                  aria-label="重试次数"
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
                </select>
              </label>

              <label>
                重试间隔
                <select
                  aria-label="重试间隔"
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
                </select>
              </label>

              <label>
                失败记录保留
                <select
                  aria-label="失败记录保留"
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
                </select>
              </label>
            </div>

            <div className="toggle-grid">
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="失败后自动重试"
                  checked={senderDraft.retryEnabled}
                  onChange={(event) => {
                    setSenderDraft((current) => ({ ...current, retryEnabled: event.target.checked }));
                    setSenderSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>失败后自动重试</span>
              </label>
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="允许临时覆盖发件身份"
                  checked={senderDraft.allowManualOverride}
                  onChange={(event) => {
                    setSenderDraft((current) => ({ ...current, allowManualOverride: event.target.checked }));
                    setSenderSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>允许临时覆盖发件身份</span>
              </label>
            </div>
          </div>

          <div className="integration-inline-actions">
            <button className="workspace-action-button primary" onClick={saveSenderRules} type="button">
              保存发件规则
            </button>
            {senderSavedNotice ? <p className="mail-settings-save-notice" role="status">发件规则已保存</p> : null}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card mail-settings-section">
          <div className="integration-card-copy compact">
            <p className="panel-kicker">路由优先</p>
            <h2>通知与路由</h2>
            <p className="section-copy">集中定义 Webhook、Telegram、失败告警与异常 / 无匹配邮件的默认流转方式。</p>
          </div>

          <div className="mail-settings-field-grid">
            <div className="toggle-grid">
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="Webhook 通知"
                  checked={routingDraft.webhookEnabled}
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, webhookEnabled: event.target.checked }));
                    setRoutingSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>Webhook 通知</span>
              </label>
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="Telegram 通知"
                  checked={routingDraft.telegramEnabled}
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, telegramEnabled: event.target.checked }));
                    setRoutingSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>Telegram 通知</span>
              </label>
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="失败告警"
                  checked={routingDraft.failureAlerts}
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, failureAlerts: event.target.checked }));
                    setRoutingSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>失败告警</span>
              </label>
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="异常 / 无匹配提醒"
                  checked={routingDraft.exceptionAlerts}
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, exceptionAlerts: event.target.checked }));
                    setRoutingSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>异常 / 无匹配提醒</span>
              </label>
            </div>

            <label>
              Webhook 端点
              <input
                aria-label="Webhook 端点"
                onChange={(event) => {
                  setRoutingDraft((current) => ({ ...current, webhookEndpoint: event.target.value }));
                  setRoutingSavedNotice(false);
                }}
                type="url"
                value={routingDraft.webhookEndpoint}
              />
            </label>

            <div className="mail-settings-inline-grid">
              <label>
                Telegram 目标
                <input
                  aria-label="Telegram 目标"
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, telegramTarget: event.target.value }));
                    setRoutingSavedNotice(false);
                  }}
                  type="text"
                  value={routingDraft.telegramTarget}
                />
              </label>

              <label>
                异常处理策略
                <select
                  aria-label="异常处理策略"
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
                </select>
              </label>

              <label>
                异常归属
                <select
                  aria-label="异常归属"
                  onChange={(event) => {
                    setRoutingDraft((current) => ({ ...current, fallbackOwner: event.target.value }));
                    setRoutingSavedNotice(false);
                  }}
                  value={routingDraft.fallbackOwner}
                >
                  {options.fallbackOwners.map((fallbackOwner) => (
                    <option key={fallbackOwner} value={fallbackOwner}>
                      {fallbackOwner}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="integration-inline-actions">
            <button className="workspace-action-button primary" onClick={saveRoutingRules} type="button">
              保存通知与路由
            </button>
            {routingSavedNotice ? <p className="mail-settings-save-notice" role="status">通知与路由已保存</p> : null}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card mail-settings-section">
          <div className="integration-card-copy compact">
            <p className="panel-kicker">工作台偏好</p>
            <h2>工作台行为偏好</h2>
            <p className="section-copy">把默认进入位置、异常展开方式和列表密度放在第三顺位，不抢前两块的注意力。</p>
          </div>

          <div className="mail-settings-field-grid">
            <div className="mail-settings-inline-grid">
              <label>
                默认进入页面
                <select
                  aria-label="默认进入页面"
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
                </select>
              </label>

              <label>
                发件箱默认筛选
                <select
                  aria-label="发件箱默认筛选"
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
                </select>
              </label>

              <label>
                列表密度
                <select
                  aria-label="列表密度"
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
                </select>
              </label>
            </div>

            <div className="toggle-grid">
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="默认展开异常记录"
                  checked={workspaceDraft.expandExceptionsByDefault}
                  onChange={(event) => {
                    setWorkspaceDraft((current) => ({ ...current, expandExceptionsByDefault: event.target.checked }));
                    setWorkspaceSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>默认展开异常记录</span>
              </label>
              <label className="integration-detail-card checkbox-row">
                <input
                  aria-label="优先打开最近失败记录"
                  checked={workspaceDraft.openLatestFailureFirst}
                  onChange={(event) => {
                    setWorkspaceDraft((current) => ({ ...current, openLatestFailureFirst: event.target.checked }));
                    setWorkspaceSavedNotice(false);
                  }}
                  type="checkbox"
                />
                <span>优先打开最近失败记录</span>
              </label>
            </div>
          </div>

          <div className="integration-inline-actions">
            <button className="workspace-action-button secondary" onClick={saveWorkspaceDefaults} type="button">
              保存工作台偏好
            </button>
            {workspaceSavedNotice ? <p className="mail-settings-save-notice" role="status">工作台偏好已保存</p> : null}
          </div>
        </section>
      </div>

      <aside aria-label="当前策略摘要" className="integration-secondary-column">
        <section className="panel workspace-card page-panel integration-side-card mail-settings-summary-card">
          <p className="panel-kicker">策略摘要</p>
          <h2>当前策略摘要</h2>
          <dl className="mail-settings-summary-list">
            <div className="mail-settings-summary-row">
              <dt>默认发件身份</dt>
              <dd>{senderSaved.defaultIdentity}</dd>
            </div>
            <div className="mail-settings-summary-row">
              <dt>失败告警</dt>
              <dd>{routingSaved.failureAlerts ? "开启" : "关闭"}</dd>
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
              <dd>{lastUpdatedLabel}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </main>
  );
}
