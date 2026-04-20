import type { MailboxSummary } from "@wemail/shared";

type InboxSummaryBarProps = {
  selectedMailbox: MailboxSummary | null;
  extractionCount: number;
  messageCount: number;
  attachmentCount: number;
  onOpenMailboxComposer: () => void;
  onOpenOutboundDrawer: () => void;
};

export function InboxSummaryBar({
  selectedMailbox,
  extractionCount,
  messageCount,
  attachmentCount,
  onOpenMailboxComposer,
  onOpenOutboundDrawer
}: InboxSummaryBarProps) {
  return (
    <section aria-label="邮件摘要工具条" className="panel workspace-card inbox-summary-bar">
      <div className="inbox-summary-mailbox">
        <p className="panel-kicker">当前邮箱</p>
        <h2>{selectedMailbox?.label ?? "未选择邮箱"}</h2>
        <p>{selectedMailbox?.address ?? "先创建或选择一个邮箱开始查看邮件。"}</p>
      </div>

      <dl aria-label="邮件摘要统计" className="inbox-summary-stats">
        <div>
          <dt>待提取</dt>
          <dd>{extractionCount}</dd>
        </div>
        <div>
          <dt>当前消息</dt>
          <dd>{messageCount}</dd>
        </div>
        <div>
          <dt>附件</dt>
          <dd>{attachmentCount}</dd>
        </div>
      </dl>

      <div className="inbox-summary-actions">
        <button className="workspace-action-button secondary" onClick={onOpenMailboxComposer} type="button">
          新建邮箱
        </button>
        <button className="workspace-action-button primary" onClick={onOpenOutboundDrawer} type="button">
          发送测试邮件
        </button>
      </div>
    </section>
  );
}
