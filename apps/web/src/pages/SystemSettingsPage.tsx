import {
  Activity,
  ArrowRight,
  Database,
  Globe2,
  HardDrive,
  History,
  MonitorCog,
  MoonStar,
  Palette,
  Radar,
  ShieldCheck,
  SunMedium,
  type LucideIcon
} from "lucide-react";
import type {
  DataReliabilitySummary,
  ProductMaturitySummary,
  RuntimeSettings,
  RuntimeSettingsUpdateInput,
  SystemDiagnosticStatus,
  SystemDiagnosticsSummary,
  SystemOperationsSummary
} from "@wemail/shared";

import type { WorkspaceTheme, WorkspaceThemePreference } from "../app/useWorkspaceTheme";
import { SystemDomainSettingsPanel } from "../features/settings/SystemDomainSettingsPanel";
import { SystemRuntimeSettingsPanel } from "../features/settings/SystemRuntimeSettingsPanel";
import { Badge } from "../shared/badge";
import { Button, ButtonLink } from "../shared/button";
import { Page } from "../shared/page-layout";

type SystemSettingsPageProps = {
  canManageDomains?: boolean;
  canManageRuntimeSettings?: boolean;
  runtimeSettings: RuntimeSettings | null;
  systemDiagnostics?: SystemDiagnosticsSummary | null;
  systemMaturity?: ProductMaturitySummary | null;
  systemOperations?: SystemOperationsSummary | null;
  systemReliability?: DataReliabilitySummary | null;
  resolvedTheme: WorkspaceTheme;
  themePreference: WorkspaceThemePreference;
  onSelectThemePreference: (preference: WorkspaceThemePreference) => void;
  onSaveRuntimeSettings: (payload: RuntimeSettingsUpdateInput) => Promise<void>;
};

const themeOptions: Array<{
  value: WorkspaceThemePreference;
  label: string;
  description: string;
  icon: LucideIcon;
  surfaceClassName: string;
}> = [
  {
    value: "light",
    label: "浅色模式",
    description: "高亮界面",
    icon: SunMedium,
    surfaceClassName: "light"
  },
  {
    value: "dark",
    label: "深色模式",
    description: "低光界面",
    icon: MoonStar,
    surfaceClassName: "dark"
  },
  {
    value: "system",
    label: "跟随系统",
    description: "系统同步",
    icon: MonitorCog,
    surfaceClassName: "system"
  }
];

function formatThemePreference(preference: WorkspaceThemePreference) {
  if (preference === "light") return "浅色模式";
  if (preference === "dark") return "深色模式";
  return "跟随系统";
}

function formatResolvedTheme(theme: WorkspaceTheme) {
  return theme === "dark" ? "深色" : "浅色";
}

function formatDiagnosticStatus(status: SystemDiagnosticStatus) {
  if (status === "ok") return "全部正常";
  if (status === "warning") return "有提醒";
  return "需要处理";
}

function getDiagnosticBadgeVariant(status: SystemDiagnosticStatus) {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  return "danger";
}

function formatOperationSource(source: SystemOperationsSummary["recentEvents"][number]["source"]) {
  if (source === "diagnostic") return "诊断";
  if (source === "webhook") return "Webhook";
  if (source === "telegram") return "Telegram";
  if (source === "outbound") return "发信";
  return "存储";
}

function formatOperationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function SystemSettingsPage({
  canManageDomains = false,
  canManageRuntimeSettings = false,
  runtimeSettings,
  systemDiagnostics = null,
  systemMaturity = null,
  systemOperations = null,
  systemReliability = null,
  resolvedTheme,
  themePreference,
  onSelectThemePreference,
  onSaveRuntimeSettings
}: SystemSettingsPageProps) {
  const themePreferenceLabel = formatThemePreference(themePreference);
  const resolvedThemeLabel = formatResolvedTheme(resolvedTheme);
  const domainPermissionLabel = canManageDomains ? "成员可管理" : "仅查看";

  return (
    <Page as="main" className="workspace-grid system-settings-grid system-settings-page">
      <section aria-label="系统设置概览" className="panel workspace-card page-panel system-settings-overview-panel">
        <div className="system-settings-overview-copy">
          <div className="system-settings-overview-icon" aria-hidden="true">
            <MonitorCog size={24} strokeWidth={1.8} />
          </div>
          <div>
            <p className="panel-kicker">系统设置</p>
            <h1>系统控制台</h1>
            <div className="system-settings-overview-badges">
              <Badge variant={resolvedTheme === "dark" ? "info" : "warning"}>{resolvedThemeLabel}界面</Badge>
              <Badge variant={canManageDomains ? "brand" : "neutral"}>
                {canManageDomains ? "域名开放管理" : "只读权限"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="system-settings-summary-grid" role="list">
          <div aria-label="当前主题模式" className="system-settings-summary-card" role="listitem">
            <Palette size={18} strokeWidth={1.8} />
            <span>当前主题模式</span>
            <strong>{themePreferenceLabel}</strong>
          </div>
          <div aria-label="当前解析主题" className="system-settings-summary-card" role="listitem">
            <MoonStar size={18} strokeWidth={1.8} />
            <span>当前解析主题</span>
            <strong>{resolvedThemeLabel}</strong>
          </div>
          <div aria-label="域名管理权限" className="system-settings-summary-card" role="listitem">
            <ShieldCheck size={18} strokeWidth={1.8} />
            <span>域名管理权限</span>
            <strong>{domainPermissionLabel}</strong>
          </div>
        </div>
      </section>

      <div className="system-settings-content-grid">
        <div aria-label="系统设置主设置" className="system-settings-main-column">
          <section className="panel workspace-card page-panel system-settings-panel">
            <div className="system-settings-section-head">
              <div>
                <p className="panel-kicker">主题模式</p>
                <h2>外观</h2>
              </div>
              <Badge variant="info">{themePreferenceLabel}</Badge>
            </div>

            <div className="appearance-option-grid" role="list" aria-label="主题模式选项">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = themePreference === option.value;

                return (
                  <Button
                    aria-label={option.label}
                    aria-pressed={isActive}
                    className={`appearance-option-card${isActive ? " active" : ""}`}
                    contentLayout="plain"
                    isActive={isActive}
                    key={option.value}
                    onClick={() => onSelectThemePreference(option.value)}
                    variant="text"
                  >
                    <span className={`appearance-option-preview ${option.surfaceClassName}`} aria-hidden="true">
                      <span className="appearance-option-preview-topbar" />
                      <span className="appearance-option-preview-sidebar" />
                      <span className="appearance-option-preview-canvas" />
                    </span>
                    <span className="appearance-option-copy">
                      <span className="appearance-option-title">
                        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                        <strong>{option.label}</strong>
                      </span>
                      <small>{option.description}</small>
                    </span>
                  </Button>
                );
              })}
            </div>
          </section>
          {canManageRuntimeSettings ? (
            <SystemRuntimeSettingsPanel
              runtimeSettings={runtimeSettings}
              onSaveRuntimeSettings={onSaveRuntimeSettings}
            />
          ) : null}
          {canManageDomains ? <SystemDomainSettingsPanel /> : null}
        </div>

        <aside aria-label="系统设置状态侧栏" className="system-settings-side-rail">
          <section className="panel workspace-card page-panel system-settings-rail-panel">
            <div className="system-settings-rail-heading">
              <Palette size={19} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="panel-kicker">当前外观</p>
                <h2>{resolvedThemeLabel}界面</h2>
              </div>
            </div>
            <div className="system-settings-rail-list">
              <div className="system-settings-rail-row">
                <span>偏好</span>
                <strong>{themePreferenceLabel}</strong>
              </div>
              <div className="system-settings-rail-row">
                <span>解析</span>
                <strong>{resolvedThemeLabel}</strong>
              </div>
            </div>
          </section>

          {systemOperations ? (
            <section className="panel workspace-card page-panel system-settings-rail-panel">
              <div className="system-settings-rail-heading">
                <Activity size={19} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">错误中心</p>
                  <h2>运维中心</h2>
                </div>
              </div>
              <div className="system-settings-rail-list">
                <div className="system-settings-rail-row">
                  <span>总体状态</span>
                  <Badge variant={getDiagnosticBadgeVariant(systemOperations.overallStatus)}>
                    {formatDiagnosticStatus(systemOperations.overallStatus)}
                  </Badge>
                </div>
                <div aria-label="运维信号" className="system-settings-operation-signals" role="list">
                  {systemOperations.signals.map((signal) => (
                    <div className="system-settings-operation-signal" key={signal.label} role="listitem">
                      <span>{signal.label}</span>
                      <Badge variant={getDiagnosticBadgeVariant(signal.status)}>{signal.value}</Badge>
                    </div>
                  ))}
                </div>
                <div aria-label="最近运维事件" className="system-settings-operation-events">
                  {systemOperations.recentEvents.length > 0 ? (
                    systemOperations.recentEvents.map((event) => (
                      <article className="system-settings-operation-event" data-severity={event.severity} key={event.id}>
                        <div className="system-settings-operation-event-head">
                          <Badge variant={getDiagnosticBadgeVariant(event.severity)}>{formatOperationSource(event.source)}</Badge>
                          <time dateTime={event.occurredAt}>{formatOperationTime(event.occurredAt)}</time>
                        </div>
                        <strong>{event.label}</strong>
                        <p>{event.message}</p>
                        {event.actionHref ? (
                          <ButtonLink
                            size="xs"
                            to={event.actionHref}
                            trailingIcon={<ArrowRight size={13} strokeWidth={1.9} />}
                            variant="ghost"
                          >
                            {event.actionLabel ?? "查看"}
                          </ButtonLink>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="system-settings-operation-empty">最近没有需要处理的事件</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {systemReliability ? (
            <section className="panel workspace-card page-panel system-settings-rail-panel system-reliability-panel">
              <div className="system-settings-rail-heading">
                <Database size={19} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">数据可靠性</p>
                  <h2>可靠性后台</h2>
                </div>
              </div>
              <div className="system-settings-rail-list">
                <div className="system-settings-rail-row">
                  <span>总体状态</span>
                  <Badge variant={getDiagnosticBadgeVariant(systemReliability.status)}>
                    {formatDiagnosticStatus(systemReliability.status)}
                  </Badge>
                </div>
                <div className="system-reliability-grid" aria-label="存储绑定">
                  <div>
                    <Database size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span>D1</span>
                    <Badge variant={getDiagnosticBadgeVariant(systemReliability.storage.d1)}>
                      {formatDiagnosticStatus(systemReliability.storage.d1)}
                    </Badge>
                  </div>
                  <div>
                    <HardDrive size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span>R2</span>
                    <Badge variant={getDiagnosticBadgeVariant(systemReliability.storage.r2)}>
                      {formatDiagnosticStatus(systemReliability.storage.r2)}
                    </Badge>
                  </div>
                </div>
                <div className="system-reliability-note">
                  <strong>幂等入库</strong>
                  <p>{systemReliability.idempotency.message}</p>
                </div>
                <div className="system-reliability-note">
                  <strong>Migration</strong>
                  <p>{systemReliability.migrations.length} 个迁移已纳入可靠性检查。</p>
                </div>
                <div aria-label="最近清理任务" className="system-reliability-runs">
                  <div className="system-reliability-subhead">
                    <History size={16} strokeWidth={1.8} aria-hidden="true" />
                    <strong>最近清理</strong>
                  </div>
                  {systemReliability.cleanup.recentRuns.length > 0 ? (
                    systemReliability.cleanup.recentRuns.slice(0, 3).map((run) => (
                      <p data-status={run.status} key={run.id}>
                        <span>{run.status === "success" ? "成功" : "失败"}</span>
                        <small>{run.deletedMessages} 封邮件 / {run.deletedAttachments} 个附件</small>
                      </p>
                    ))
                  ) : (
                    <p>
                      <span>暂无运行记录</span>
                      <small>下一次 Cron 清理后会显示。</small>
                    </p>
                  )}
                </div>
                <div aria-label="备份恢复命令" className="system-reliability-runbook">
                  {systemReliability.backupRunbook.slice(0, 2).map((step) => (
                    <div key={step.title}>
                      <strong>{step.title}</strong>
                      <code>{step.command}</code>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {systemDiagnostics ? (
            <section className="panel workspace-card page-panel system-settings-rail-panel">
              <div className="system-settings-rail-heading">
                <Radar size={19} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">部署就绪</p>
                  <h2>系统诊断</h2>
                </div>
              </div>
              <div className="system-settings-rail-list">
                <div className="system-settings-rail-row">
                  <span>总体状态</span>
                  <Badge variant={getDiagnosticBadgeVariant(systemDiagnostics.overallStatus)}>
                    {formatDiagnosticStatus(systemDiagnostics.overallStatus)}
                  </Badge>
                </div>
                <div className="system-settings-rail-row">
                  <span>环境</span>
                  <strong>{systemDiagnostics.environment}</strong>
                </div>
                {systemDiagnostics.checks.map((check) => (
                  <div className="system-settings-rail-row" key={check.id}>
                    <span>{check.label}</span>
                    <strong>{check.message}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {systemMaturity ? (
            <section className="panel workspace-card page-panel system-settings-rail-panel">
              <div className="system-settings-rail-heading">
                <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">产品成熟度</p>
                  <h2>成熟度总览</h2>
                </div>
              </div>
              <div className="system-settings-rail-list">
                <div className="system-settings-rail-row">
                  <span>总体状态</span>
                  <Badge variant={getDiagnosticBadgeVariant(systemMaturity.overallStatus)}>
                    {formatDiagnosticStatus(systemMaturity.overallStatus)}
                  </Badge>
                </div>
                <div className="system-settings-rail-row">
                  <span>完成方向</span>
                  <strong>
                    {systemMaturity.completedAreas} / {systemMaturity.totalAreas}
                  </strong>
                </div>
                {systemMaturity.areas.map((area) => (
                  <div className="system-settings-rail-row" key={area.id}>
                    <span>{area.title}</span>
                    <strong>
                      {area.progress}% · {formatDiagnosticStatus(area.status)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="panel workspace-card page-panel system-settings-rail-panel">
            <div className="system-settings-rail-heading">
              <Globe2 size={19} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="panel-kicker">域名权限</p>
                <h2>{domainPermissionLabel}</h2>
              </div>
            </div>
            <div className="system-settings-rail-list">
              <div className="system-settings-rail-row">
                <span>管理范围</span>
                <strong>{canManageDomains ? "邮箱域名" : "系统外观"}</strong>
              </div>
              <div className="system-settings-rail-row">
                <span>状态</span>
                <strong>{canManageDomains ? "已开放" : "只读"}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
}
