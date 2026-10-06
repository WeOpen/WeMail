import { useEffect, useRef, useState } from "react";
import type { NotificationRuleEvaluation, NotificationRuleTarget } from "@wemail/shared";

import { Button } from "../../shared/button";
import { FormField, SelectInput, TextInput } from "../../shared/form";
import { evaluateNotificationSample } from "./notification-api";
import { notificationRuleEventOptions, notificationTargetLabels } from "./webhook-content";
import "./notification-status.css";

const reasonLabels: Record<string, string> = {
  disabled: "规则已停用", target_mismatch: "目标未匹配", event_mismatch: "事件未匹配",
  mailbox_mismatch: "邮箱未匹配", keyword_mismatch: "关键词未匹配", quiet_hours: "处于免打扰时间"
};

export function NotificationRuleTester() {
  const [target, setTarget] = useState<NotificationRuleTarget>("webhook");
  const [eventType, setEventType] = useState("message.received");
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState("");
  const [mailboxId, setMailboxId] = useState("");
  const [result, setResult] = useState<NotificationRuleEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  async function handleTest() {
    setIsTesting(true);
    setError(null);
    try {
      const next = await evaluateNotificationSample({ target, eventType, targetId: targetId || undefined, data: { subject: text, text, mailboxId: mailboxId || undefined } });
      if (isMounted.current) setResult(next);
    } catch (failure) { if (isMounted.current) setError(failure instanceof Error ? failure.message : "规则测试失败"); }
    finally { if (isMounted.current) setIsTesting(false); }
  }

  return (
    <section className="panel workspace-card page-panel notification-rule-tester" aria-label="通知规则试运行">
      <h3>通知规则试运行</h3><p className="section-copy">根据已保存的规则判断是否匹配，仅评估结果，不发送通知。</p>
      <div className="notification-rule-test-fields">
        <FormField label="测试目标"><SelectInput aria-label="测试通知目标" value={target} onChange={(event) => setTarget(event.target.value as NotificationRuleTarget)}>
          {(Object.keys(notificationTargetLabels) as NotificationRuleTarget[]).map((value) => <option key={value} value={value}>{notificationTargetLabels[value]}</option>)}
        </SelectInput></FormField>
        <FormField label="测试事件"><SelectInput aria-label="测试通知事件" value={eventType} onChange={(event) => setEventType(event.target.value)}>
          {notificationRuleEventOptions.map((value) => <option key={value.value} value={value.value}>{value.label}</option>)}
        </SelectInput></FormField>
        <FormField label="测试邮件内容"><TextInput aria-label="测试邮件内容" value={text} onChange={(event) => setText(event.target.value)} placeholder="邮件主题、关键词或验证码" /></FormField>
        <FormField label="目标 ID（可选）"><TextInput aria-label="测试目标 ID" value={targetId} onChange={(event) => setTargetId(event.target.value)} /></FormField>
        <FormField label="邮箱 ID（可选）"><TextInput aria-label="测试邮箱 ID" value={mailboxId} onChange={(event) => setMailboxId(event.target.value)} /></FormField>
      </div>
      <Button onClick={() => void handleTest()} disabled={isTesting} size="sm" variant="secondary">测试通知规则</Button>
      {error ? <p role="alert" className="error-banner">{error}</p> : null}
      {result ? <div role="status">
        <p><strong>{result.shouldSend ? "此事件会通过通知规则" : "此事件未通过通知规则"}</strong>{result.reason === "no_enabled_rules" ? "：该目标没有启用的规则，按默认策略放行。" : ""}</p>
        <ul>{result.rules.map((rule) => <li key={rule.id}>{rule.name}：{rule.matched ? "全部条件匹配" : rule.reasons.map((reason) => reasonLabels[reason] ?? reason).join("、")} · 时区 {rule.quietHoursTimezone}</li>)}</ul>
      </div> : null}
    </section>
  );
}
