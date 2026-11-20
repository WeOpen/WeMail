import type { DataReliabilitySummary, SystemDiagnosticsSummary } from "@wemail/shared";

import { Badge } from "../../shared/badge";
import { ButtonAnchor, ButtonLink } from "../../shared/button";
import "./setup-diagnostics.css";

const docsBase = "/docs";

function checkHelp(id: string) {
  if (id === "mail.domains") return { href: "#setup-domains", label: "修改邮箱域名" };
  if (id.startsWith("telegram.")) return { href: "/telegram", label: "打开 Telegram 设置" };
  if (id.startsWith("outbound.")) return { href: "/mail/settings", label: "打开发信设置" };
  return { href: `${docsBase}/worker-config`, label: "查看配置步骤" };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : date.toLocaleString("zh-CN", { hour12: false });
}

export function SetupDiagnosticsPanel({ diagnostics, reliability }: {
  diagnostics: SystemDiagnosticsSummary | null;
  reliability: DataReliabilitySummary | null;
}) {
  const lastCleanup = reliability?.cleanup.recentRuns[0];
  const hasSuccessfulCleanup = lastCleanup?.status === "success";

  return (
    <section aria-label="自托管检查" className="panel workspace-card page-panel setup-diagnostics" id="setup-checks">
      <div className="setup-diagnostics-heading">
        <h2>自托管检查</h2>
        <Badge variant="neutral">配置快照</Badge>
      </div>
      <p>配置存在不代表服务已连通。Email Routing、发信和通知请分别用真实邮件与测试消息确认。</p>
      {diagnostics ? (
        <>
          <small>检查时间：{formatDate(diagnostics.generatedAt)}</small>
          <ul className="setup-diagnostics-list">
            {diagnostics.checks.filter((check) => check.id !== "runtime.environment").map((check) => {
              const help = checkHelp(check.id);
              return (
                <li key={check.id}>
                  <div className="setup-diagnostics-heading">
                    <strong>{check.label}</strong>
                    <Badge variant={check.status === "ok" ? "neutral" : check.status === "error" ? "danger" : "warning"}>
                      {check.status === "ok" ? "已配置 / 已关闭" : "需要处理"}
                    </Badge>
                  </div>
                  <p>{check.message}</p>
                  {check.action ? <p>{check.action}</p> : null}
                  {check.status !== "ok" ? help.href.startsWith("/") ? (
                    <ButtonLink size="sm" to={help.href} variant="text">{help.label}</ButtonLink>
                  ) : <ButtonAnchor href={help.href} size="sm" variant="text">{help.label}</ButtonAnchor> : null}
                </li>
              );
            })}
            <li>
              <strong>Email Routing</strong>
              <p>尚未执行真实收件验证。到 Cloudflare 的目标域名启用 Email Routing，并将测试地址或 Catch-all 路由到当前 Worker。</p>
              <ButtonLink to={`${docsBase}/email-routing`} size="sm" variant="text">查看收件路由步骤</ButtonLink>
              <ButtonLink size="sm" to="/mail/list" variant="text">发送首封测试邮件</ButtonLink>
            </li>
            <li>
              <strong>密钥与功能开关</strong>
              <p>在 Worker Secrets 中配置启用能力所需的密钥；功能开关可在本页调整。API 调用密钥在「API 密钥」中单独创建。</p>
              <ButtonLink to={`${docsBase}/worker-config`} size="sm" variant="text">查看 Worker Secrets</ButtonLink>
              <ButtonLink size="sm" to="/api-keys" variant="text">管理 API 密钥</ButtonLink>
            </li>
            <li>
              <div className="setup-diagnostics-heading">
                <strong>清理与重试调度</strong>
                <Badge variant={hasSuccessfulCleanup ? "neutral" : "warning"}>{hasSuccessfulCleanup ? "最近清理成功" : "需要验证"}</Badge>
              </div>
              <p>{lastCleanup
                ? `${formatDate(lastCleanup.startedAt)} · ${lastCleanup.status === "success" ? "清理已完成" : lastCleanup.errorText || "清理失败"}`
                : "暂无清理运行记录。"}</p>
              <p>Cloudflare Cron Triggers 需同时保留每分钟重试与每小时清理。已有记录不能证明当前 Cron 配置仍有效。</p>
              {reliability ? <p>待清理过期邮件：{reliability.cleanup.expiredMessages}</p> : null}
              <ButtonLink to={`${docsBase}/self-hosted-domain#清理调度与成本`} size="sm" variant="text">核对 Cron 与恢复步骤</ButtonLink>
            </li>
          </ul>
        </>
      ) : (
        <>
          <p role="status">诊断暂不可用，请刷新页面重试；配置步骤仍可在文档中查看。</p>
          <ButtonAnchor href={`${docsBase}/self-hosted-domain.mdx`} size="sm" variant="secondary">查看自托管配置步骤</ButtonAnchor>
        </>
      )}
    </section>
  );
}
