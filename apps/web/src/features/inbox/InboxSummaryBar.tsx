import type { MailboxSummary } from "@wemail/shared";
import { Button } from "../../shared/button";

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
        <Button onClick={onOpenMailboxComposer} variant="secondary">
          新建邮箱
        </Button>
        <Button onClick={onOpenOutboundDrawer} variant="primary">
          发送测试邮件
        </Button>
      </div>
    </section>
  );
}
