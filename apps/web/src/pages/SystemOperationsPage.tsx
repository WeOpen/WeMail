import {
  Activity,
  ArrowRight,
  Database,
  HardDrive,
  History,
  Radar,
  ShieldCheck
} from "lucide-react";
import type {
  DataReliabilitySummary,
  ProductMaturitySummary,
  SystemDiagnosticStatus,
  SystemDiagnosticsSummary,
  SystemOperationsSummary
} from "@wemail/shared";

import { Badge } from "../shared/badge";
import { ButtonLink } from "../shared/button";
import { Page } from "../shared/page-layout";

type SystemOperationsPageProps = {
  systemDiagnostics?: SystemDiagnosticsSummary | null;
  systemMaturity?: ProductMaturitySummary | null;
  systemOperations?: SystemOperationsSummary | null;
  systemReliability?: DataReliabilitySummary | null;
};

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

export function SystemOperationsPage({
  systemDiagnostics = null,
  systemMaturity = null,
  systemOperations = null,
  systemReliability = null
}: SystemOperationsPageProps) {
  const hasOperationsData = Boolean(systemOperations || systemReliability || systemDiagnostics || systemMaturity);

  return (
    <Page as="main" className="workspace-grid system-operations-page">
      <section aria-label="运维中心概览" className="panel workspace-card page-panel system-settings-overview-panel">
        <div className="system-settings-overview-copy">
          <div className="system-settings-overview-icon" aria-hidden="true">
            <Activity size={24} strokeWidth={1.8} />
          </div>
          <div>
            <p className="panel-kicker">运维中心</p>
            <h1>运维中心</h1>
            <div className="system-settings-overview-badges">
              <Badge variant={systemOperations?.overallStatus === "error" ? "danger" : "info"}>错误中心</Badge>
              <Badge variant={systemReliability?.status === "ok" ? "success" : "warning"}>数据可靠性</Badge>
            </div>
          </div>
        </div>
      </section>

      {hasOperationsData ? (
        <div aria-label="运维中心卡片" className="system-operations-grid">
          {systemOperations ? (
            <section className="panel workspace-card page-panel system-settings-rail-panel">
              <div className="system-settings-rail-heading">
                <Activity size={19} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <p className="panel-kicker">错误中心</p>
                  <h2>错误中心</h2>
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
                        <small>
                          {run.deletedMessages} 封邮件 / {run.deletedAttachments} 个附件
                        </small>
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
        </div>
      ) : (
        <section className="panel workspace-card page-panel system-settings-panel">
          <p className="panel-kicker">运维中心</p>
          <h2>暂无运维数据</h2>
          <p className="section-copy">当前会话没有可展示的错误中心、可靠性、诊断或成熟度数据。</p>
        </section>
      )}
    </Page>
  );
}
