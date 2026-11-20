import { useState } from "react";
import type { MailboxSummary, MessageSummary, UserRole } from "@wemail/shared";

import { Button, ButtonAnchor, ButtonLink } from "../../shared/button";
import { CopyButton } from "../../shared/copy-button";
import "./first-mail-guide.css";

type FirstMailGuideProps = {
  mailbox: MailboxSummary | null;
  message: MessageSummary | null;
  role: UserRole;
  onCreateMailbox: () => void;
  onRefresh: () => Promise<void>;
};

export function FirstMailGuide({ mailbox, message, role, onCreateMailbox, onRefresh }: FirstMailGuideProps) {
  const completionKey = mailbox ? `wemail:first-mail:${mailbox.id}` : null;
  const [hasCopiedResult, setHasCopiedResult] = useState(() => {
    try { return completionKey ? window.localStorage.getItem(completionKey) === "complete" : false; } catch { return false; }
  });
  const [isExpanded, setIsExpanded] = useState(!message && !hasCopiedResult);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const extraction = message?.extraction?.value ? message.extraction : null;
  const step = !mailbox ? 1 : !message ? 2 : !hasCopiedResult ? 3 : 4;
  const mailto = mailbox
    ? `mailto:${encodeURIComponent(mailbox.address)}?subject=${encodeURIComponent("WeMail 收件测试")}&body=${encodeURIComponent("Your verification code is 482913. This code expires in 10 minutes.")}`
    : "";

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await onRefresh();
    } catch {
      setRefreshError("刷新失败，请稍后重试。");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section aria-label="首封邮件引导" className="panel workspace-card first-mail-guide">
      <div className="first-mail-guide-heading">
        <h2>{hasCopiedResult ? "首封邮件已完成" : "接收第一封邮件"}</h2>
        <Button aria-expanded={isExpanded} onClick={() => setIsExpanded((current) => !current)} size="sm" variant="text">
          {isExpanded ? "收起引导" : "展开引导"}
        </Button>
      </div>
      {isExpanded ? (
        <>
          <ol className="first-mail-guide-steps">
            {["创建邮箱", "从其他邮箱发信", "收到并复制", "通知（可选）"].map((label, index) => (
              <li aria-current={step === index + 1 ? "step" : undefined} data-complete={step > index + 1} key={label}>
                <span aria-hidden="true">{index + 1}</span>{label}
              </li>
            ))}
          </ol>
          {!mailbox ? (
            <div className="first-mail-guide-actions">
              <Button onClick={onCreateMailbox} size="sm">创建首个邮箱</Button>
            </div>
          ) : !message ? (
            <div className="first-mail-guide-content">
              <p>用常用邮箱向 <strong>{mailbox.address}</strong> 发送正文为「Your verification code is 482913」的邮件。</p>
              <div className="first-mail-guide-actions">
                <CopyButton onCopy={() => setCopyError(null)} onCopyError={() => setCopyError("复制失败，请手动选择邮箱地址复制。")} value={mailbox.address}>复制收件地址</CopyButton>
                <ButtonAnchor href={mailto} size="sm" variant="secondary">打开邮件客户端</ButtonAnchor>
                <Button isLoading={isRefreshing} onClick={() => void handleRefresh()} size="sm" variant="text">检查收件</Button>
              </div>
              <p className="first-mail-guide-hint">真实收件需要已部署的 Email Routing；本地开发不会接收互联网邮件。</p>
              <ButtonLink size="sm" to={role === "admin" ? "/system/settings#setup-checks" : "/docs"} variant="text">
                {role === "admin" ? "未收到？检查收件配置" : "未收到？查看收件说明"}
              </ButtonLink>
            </div>
          ) : !hasCopiedResult ? (
            <div className="first-mail-guide-content">
              <p>已收到：<strong>{message.subject || "无主题邮件"}</strong></p>
              {extraction ? (
                <div className="first-mail-guide-actions">
                  <code>{extraction.value}</code>
                  <CopyButton
                    onCopy={() => {
                      setHasCopiedResult(true);
                      setCopyError(null);
                      // A blocked browser store must not turn a successful clipboard operation into an error.
                      try { if (completionKey) window.localStorage.setItem(completionKey, "complete"); } catch { /* Keep progress for this visit. */ }
                    }}
                    onCopyError={() => setCopyError("复制失败，请手动选择提取值复制后重试。")}
                    value={extraction.value}
                  >复制收到的提取结果</CopyButton>
                </div>
              ) : <p>这封邮件没有提取结果。再发送一封正文包含「Your verification code is 482913」的邮件。</p>}
            </div>
          ) : (
            <div className="first-mail-guide-actions">
              <ButtonLink size="sm" to="/telegram" variant="secondary">配置 Telegram 通知</ButtonLink>
              <ButtonLink size="sm" to="/webhook" variant="secondary">配置聊天 Webhook</ButtonLink>
              <Button onClick={() => setIsExpanded(false)} size="sm" variant="text">完成引导</Button>
            </div>
          )}
          {copyError || refreshError ? <p className="form-message" data-tone="error" role="alert">{copyError || refreshError}</p> : null}
        </>
      ) : null}
    </section>
  );
}
