import type { MessageSummary } from "@wemail/shared";
import { toMessageDetailViewModel } from "./view-models";

type MessageDetailPanelProps = {
  selectedMessage: MessageSummary | null;
};

export function MessageDetailPanel({ selectedMessage }: MessageDetailPanelProps) {
  const viewModel = toMessageDetailViewModel(selectedMessage);

  return (
    <section className="panel workspace-card detail-panel">
      <div className="panel-header workspace-card-header detail-panel-header">
        <div>
          <p className="panel-kicker">Message detail</p>
          <h2>{viewModel?.subject ?? "Select a message"}</h2>
        </div>
      </div>
      {viewModel ? (
        <>
          <div className="detail-meta workspace-meta-row">
            <span>From {viewModel.fromAddress}</span>
            <span>{viewModel.receivedAtLabel}</span>
          </div>
          <div className="extraction-card">
            <p>Extraction</p>
            <strong>{viewModel.extraction.value || "No code or link was detected"}</strong>
            <span>{viewModel.extraction.label}</span>
          </div>
          {viewModel.oversizeStatus ? <div className="warning-card">Oversize handling: {viewModel.oversizeStatus}</div> : null}
          <pre className="message-body">{viewModel.bodyText}</pre>
          <div className="attachment-grid">
            {viewModel.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/messages/${viewModel.id}/attachments/${attachment.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {attachment.filename}
                <small>{attachment.sizeLabel}</small>
              </a>
            ))}
            {viewModel.attachments.length === 0 ? (
              <p className="empty-state workspace-inline-empty">No attachments were shipped with this message.</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="empty-state">Choose a mailbox and a message to inspect delivery details, extracted links, and attachments.</p>
      )}
    </section>
  );
}
