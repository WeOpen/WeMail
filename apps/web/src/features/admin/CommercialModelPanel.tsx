import { Building2, Gauge, ShieldCheck, Users } from "lucide-react";

import type { CommercialModelSummary, PlanTierSummary } from "@wemail/shared";

import { Badge } from "../../shared/badge";

type CommercialModelPanelProps = {
  commercial: CommercialModelSummary | null;
};

function formatPlanName(planId: PlanTierSummary["id"]) {
  if (planId === "team") return "团队版";
  if (planId === "pro") return "高级版";
  return "免费版";
}

export function CommercialModelPanel({ commercial }: CommercialModelPanelProps) {
  return (
    <section aria-label="商业与团队模型" className="panel workspace-card users-settings-panel users-commercial-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">商业化</p>
        </div>
        <Badge variant={commercial?.currentPlanId === "team" ? "brand" : "info"}>
          {commercial ? formatPlanName(commercial.currentPlanId) : "加载中"}
        </Badge>
      </div>

      {commercial ? (
        <>
          <div className="users-commercial-usage-grid" aria-label="组织级用量">
            <div>
              <Users size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>成员</span>
              <strong>{commercial.quotaUsage.activeUsers} / {commercial.quotaUsage.users}</strong>
            </div>
            <div>
              <Building2 size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>共享邮箱</span>
              <strong>{commercial.quotaUsage.mailboxes} / {commercial.quotaUsage.mailboxLimit}</strong>
            </div>
            <div>
              <Gauge size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>今日发信</span>
              <strong>{commercial.quotaUsage.outboundSentToday} / {commercial.quotaUsage.outboundDailyLimit}</strong>
            </div>
            <div>
              <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>API 调用</span>
              <strong>{commercial.quotaUsage.apiCallsToday} / {commercial.quotaUsage.apiDailyLimit}</strong>
            </div>
          </div>

          <div className="users-commercial-plan-grid" aria-label="套餐层级">
            {commercial.planTiers.map((tier) => (
              <article
                className="users-commercial-plan"
                data-active={tier.id === commercial.currentPlanId}
                data-plan={tier.id}
                key={tier.id}
              >
                <div>
                  <strong>{tier.name}</strong>
                  <Badge variant={tier.id === commercial.currentPlanId ? "brand" : "neutral"}>
                    {tier.id === commercial.currentPlanId ? "当前" : tier.priceLabel}
                  </Badge>
                </div>
                <p>{tier.mailboxLimit} 个邮箱 · {tier.retentionDays} 天保留 · {tier.teamSeats} 席位</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="empty-state">正在加载套餐和组织级用量。</p>
      )}
    </section>
  );
}
