import { Activity, Gauge, KeyRound, ShieldCheck } from "lucide-react";

import type { AdminGovernanceSummary, AdminLoginHistoryEvent } from "@wemail/shared";

import { Badge } from "../../shared/badge";

type GovernancePanelProps = {
  governance: AdminGovernanceSummary | null;
};

function formatLoginStatus(event: AdminLoginHistoryEvent) {
  if (event.status === "success") return "成功";
  return "失败";
}

function formatLoginMethod(event: AdminLoginHistoryEvent) {
  if (event.method === "oauth") return event.provider ? `OAuth / ${event.provider}` : "OAuth";
  return "密码";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function GovernancePanel({ governance }: GovernancePanelProps) {
  const failedLogins = governance?.loginHistory.filter((event) => event.status === "failed").length ?? 0;
  const enforcedPolicies = governance?.rateLimits.filter((policy) => policy.enforced).length ?? 0;

  return (
    <section className="panel workspace-card page-panel users-settings-panel users-governance-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">安全治理</p>
          <h2>登录、审计与限流</h2>
          <p className="section-copy">集中查看登录历史、风险操作、邀请码兑换和关键流量策略。</p>
        </div>
        <Badge variant={failedLogins > 0 ? "warning" : "success"}>{failedLogins > 0 ? `${failedLogins} 次失败` : "登录正常"}</Badge>
      </div>

      {governance ? (
        <>
          <div className="users-governance-metrics" role="list" aria-label="安全治理指标">
            <div role="listitem">
              <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>可用邀请码</span>
              <strong>{governance.inviteStats.available}</strong>
            </div>
            <div role="listitem">
              <KeyRound size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>已兑换</span>
              <strong>{governance.inviteStats.redeemed}</strong>
            </div>
            <div role="listitem">
              <Gauge size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>限流策略</span>
              <strong>
                {enforcedPolicies} / {governance.rateLimits.length}
              </strong>
            </div>
            <div role="listitem">
              <Activity size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>审计事件</span>
              <strong>{governance.auditEvents.length}</strong>
            </div>
          </div>

          <div className="users-governance-grid">
            <div className="users-governance-section">
              <h3>登录历史</h3>
              <div className="users-governance-list" role="list">
                {governance.loginHistory.length > 0 ? (
                  governance.loginHistory.slice(0, 5).map((event) => (
                    <div className="users-governance-row" data-state={event.status} key={event.id} role="listitem">
                      <div>
                        <strong>{event.userEmail}</strong>
                        <span>
                          {formatLoginMethod(event)} · {event.ipAddress ?? "未知 IP"} · {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      <Badge variant={event.status === "success" ? "success" : "danger"}>{formatLoginStatus(event)}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">暂无登录历史。</p>
                )}
              </div>
            </div>

            <div className="users-governance-section">
              <h3>风险审计</h3>
              <div className="users-governance-list" role="list">
                {governance.auditEvents.length > 0 ? (
                  governance.auditEvents.slice(0, 5).map((event) => (
                    <div className="users-governance-row" key={event.id} role="listitem">
                      <div>
                        <strong>{event.eventLabel}</strong>
                        <span>
                          {event.actorLabel} · {event.detail}
                        </span>
                      </div>
                      <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">暂无审计事件。</p>
                )}
              </div>
            </div>
          </div>

          <div className="users-governance-section">
            <h3>限流策略</h3>
            <div className="users-governance-policy-list" role="list">
              {governance.rateLimits.map((policy) => (
                <div className="users-governance-policy" key={policy.key} role="listitem">
                  <div>
                    <strong>{policy.label}</strong>
                    <span>
                      {policy.scope} · {policy.policy}
                    </span>
                    <small>{policy.currentUsage}</small>
                  </div>
                  <Badge variant={policy.enforced ? "success" : "warning"}>{policy.enforced ? "已启用" : "待绑定"}</Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="empty-state">安全治理数据同步中。</p>
      )}
    </section>
  );
}
