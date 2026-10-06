import { useEffect, useRef, useState } from "react";
import type { NotificationDeliveryStatus, NotificationRuleTarget } from "@wemail/shared";

import { Button } from "../../shared/button";
import { MetricCard } from "../../shared/metric-card";
import { fetchNotificationStatus, retryNotificationDelivery, type NotificationStatusPayload } from "./notification-api";
import "./notification-status.css";

const labels: Record<NotificationDeliveryStatus, string> = {
  pending: "待投递", processing: "投递中", retrying: "等待重试", succeeded: "投递成功", failed: "发送失败", suppressed: "已暂停"
};

function formatDate(value: string | null) {
  if (!value) return "暂无记录";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function NotificationDeliveryPanel({ target, admin = false }: { target?: NotificationRuleTarget; admin?: boolean }) {
  const [payload, setPayload] = useState<NotificationStatusPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setError(null);
    void fetchNotificationStatus({ target, admin, signal: controller.signal }).then((next) => {
      if (active) setPayload(next);
    }).catch((failure) => {
      if (active) setError(failure instanceof Error ? failure.message : "通知状态读取失败");
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [target, admin, revision]);

  async function handleReplay(id: string) {
    setIsReplaying(true);
    setError(null);
    try {
      await retryNotificationDelivery(id);
      if (isMounted.current) setRevision((current) => current + 1);
    } catch (failure) {
      if (isMounted.current) setError(failure instanceof Error ? failure.message : "通知重试失败");
    } finally { if (isMounted.current) setIsReplaying(false); }
  }

  return (
    <section className="panel workspace-card page-panel notification-status-panel" aria-label={admin ? "全站通知状态" : "通知状态"}>
      <div className="notification-status-header">
        <div><h2>{admin ? "全站通知状态" : "通知状态"}</h2><p className="section-copy">查看等待投递与最近失败，重试仍在保留期内的通知。</p></div>
        <Button onClick={() => setRevision((current) => current + 1)} disabled={isLoading} size="sm" variant="secondary">刷新通知状态</Button>
      </div>
      {error ? <p role="alert" className="error-banner">{error}</p> : null}
      {isLoading ? <p role="status">正在读取通知状态…</p> : null}
      {payload?.summary ? (
        <>
          <div className="notification-status-metrics" aria-live="polite">
            <MetricCard title="待处理" value={payload.summary.backlogCount} detail={`待投递 ${payload.summary.counts.pending} · 投递中 ${payload.summary.counts.processing}`} valueSize="lg" />
            <MetricCard title="等待重试" value={payload.summary.counts.retrying} detail="按退避策略自动尝试" valueSize="lg" />
            <MetricCard title="发送失败" value={payload.summary.counts.failed} detail="需要检查目标或手动重试" valueSize="lg" />
            <MetricCard title="最近成功" value={payload.summary.counts.succeeded} detail={formatDate(payload.summary.lastSucceededAt)} valueSize="lg" />
          </div>
          <div className="notification-status-list">
            {(payload.deliveries ?? []).length === 0 ? <p>暂无通知记录。收到符合规则的邮件后，投递状态会显示在这里。</p> : null}
            {(payload.deliveries ?? []).map((delivery) => (
              <article className="notification-status-row" key={delivery.id}>
                <div><strong>{delivery.targetName}</strong><p>{labels[delivery.status]} · 本轮已尝试 {delivery.attempts} 次</p>
                  {delivery.errorText ? <p className="notification-status-error">{delivery.errorText}</p> : null}
                  {delivery.status === "pending" || delivery.status === "retrying" ? <small>下次尝试：{formatDate(delivery.nextAttemptAt)}</small> : <small>更新于 {formatDate(delivery.updatedAt)}</small>}
                </div>
                {!admin && ["failed", "retrying", "suppressed"].includes(delivery.status) && new Date(delivery.expiresAt).getTime() > Date.now() ? (
                  <Button aria-label={`重试通知 ${delivery.id}`} disabled={isReplaying} onClick={() => void handleReplay(delivery.id)} size="sm" variant="secondary">重试通知</Button>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
