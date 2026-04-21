import type { MessageSummary } from "@wemail/shared";
import { Button, ButtonAnchor } from "../../shared/button";
import { toMessageDetailViewModel } from "./view-models";

type MessageDetailPanelProps = {
  selectedMessage: MessageSummary | null;
};

export function MessageDetailPanel({ selectedMessage }: MessageDetailPanelProps) {
  const viewModel = toMessageDetailViewModel(selectedMessage);

  if (!viewModel) {
    return (
      <section className="panel workspace-card detail-panel">
        <div className="panel-header workspace-card-header detail-panel-header">
          <div>
            <p className="panel-kicker">消息详情</p>
            <h2>请选择一封消息</h2>
          </div>
        </div>
        <p className="empty-state">请选择邮箱和消息，以查看验证码、正文和调试信息。</p>
      </section>
    );
  }

  return (
    <section className="panel workspace-card detail-panel">
      <div className="detail-panel-hero">
        <div>
          <p className="panel-kicker">消息详情</p>
          <h2>消息详情</h2>
          <p className="section-copy">{viewModel.subject}</p>
        </div>
        <span className={`message-extraction-chip ${viewModel.extractionChip.tone}`}>{viewModel.extractionChip.primary}</span>
        <div className="detail-panel-actions">
          <Button
            onClick={() => void navigator.clipboard?.writeText(viewModel.extraction.value)}
            variant="primary"
          >
            复制验证码
          </Button>
          <ButtonAnchor href={`/api/messages/${viewModel.id}`} rel="noreferrer" size="sm" target="_blank" variant="secondary">
            打开原始邮件
          </ButtonAnchor>
          <ButtonAnchor href={`/api/messages/${viewModel.id}`} rel="noreferrer" size="sm" target="_blank" variant="ghost">
            查看提取 JSON
          </ButtonAnchor>
        </div>
      </div>
      <div className="detail-meta workspace-meta-row">
        <span>发件人：{viewModel.fromAddress}</span>
        <span>{viewModel.receivedAtLabel}</span>
      </div>
      <div className="extraction-card">
        <p>提取结果</p>
        <strong>{viewModel.extraction.value || "未识别到验证码或链接"}</strong>
        <span>{viewModel.extraction.label}</span>
      </div>
      {viewModel.oversizeStatus ? <div className="warning-card">超大邮件处理：{viewModel.oversizeStatus}</div> : null}
      <pre className="message-body">{viewModel.bodyText}</pre>
      <div className="attachment-grid">
        {viewModel.attachments.map((attachment) => (
          <a key={attachment.id} href={`/api/messages/${viewModel.id}/attachments/${attachment.id}`} target="_blank" rel="noreferrer">
            {attachment.filename}
            <small>{attachment.sizeLabel}</small>
          </a>
        ))}
        {viewModel.attachments.length === 0 ? <p className="empty-state workspace-inline-empty">这封邮件没有附件。</p> : null}
      </div>
    </section>
  );
}
