import type { ReactNode } from "react";
import { ClipboardCopy, ExternalLink, FileJson, KeyRound, Link2, MailOpen, Paperclip, SearchX, type LucideIcon } from "lucide-react";

import type { MessageSummary } from "@wemail/shared";

import { Button } from "../../shared/button";
import { EmptyState } from "../../shared/empty-state/EmptyStatePrimitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shared/tooltip";
import { toMessageDetailViewModel } from "./view-models";

type MessageDetailPanelProps = {
  errorMessage?: string | null;
  isLoading?: boolean;
  onRetry?: () => void;
  selectedMessage: MessageSummary | null;
};

type DetailActionButtonProps = {
  icon: ReactNode;
  isDisabled?: boolean;
  label: string;
  onClick: () => void;
  variant: "primary" | "secondary" | "ghost";
};

function DetailActionButton({ icon, isDisabled = false, label, onClick, variant }: DetailActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-disabled={isDisabled ? true : undefined}
        aria-label={label}
        className={`ui-button ui-button-${variant} ui-button-size-sm ui-button-icon-only detail-panel-icon-action`}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault();
            return;
          }

          onClick();
        }}
      >
        <span className="ui-button-icon-slot" aria-hidden="true">
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function openMessageResource(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

function getExtractionInsight(viewModel: NonNullable<ReturnType<typeof toMessageDetailViewModel>>) {
  if (viewModel.extraction.type === "auth_code" && viewModel.extraction.value.trim()) {
    return {
      Icon: KeyRound,
      confidence: viewModel.extraction.method === "ai" ? 88 : 96,
      kind: "code",
      label: "识别到验证码",
      value: viewModel.extraction.value
    };
  }

  if (viewModel.extraction.type !== "none" && viewModel.extraction.value.trim()) {
    return {
      Icon: Link2,
      confidence: viewModel.extraction.method === "ai" ? 86 : 92,
      kind: "link",
      label: "识别到链接",
      value: viewModel.extraction.value
    };
  }

  return {
    Icon: SearchX,
    confidence: 0,
    kind: "empty",
    label: "未识别到验证码或链接",
    value: "未提取"
  };
}

export function MessageDetailPanel({ errorMessage = null, isLoading = false, onRetry, selectedMessage }: MessageDetailPanelProps) {
  const viewModel = toMessageDetailViewModel(selectedMessage);

  if (!viewModel) {
    return (
      <section aria-label="阅读与提取详情" className="panel workspace-card detail-panel inbox-detail-panel">
        <div className="panel-header workspace-card-header detail-panel-header">
          <div>
            <p className="panel-kicker">消息详情</p>
          </div>
        </div>
        {errorMessage ? (
          <div className="error-banner" role="alert">
            <span>{errorMessage}</span>
            {onRetry ? (
              <Button onClick={onRetry} size="sm" variant="secondary">
                重试加载详情
              </Button>
            ) : null}
          </div>
        ) : (
          <EmptyState
            className="detail-empty-card"
            description={isLoading ? "正在加载邮件详情..." : "请选择邮箱和消息，以查看验证码、正文和调试信息。"}
            icon={<MailOpen size={28} strokeWidth={1.8} aria-hidden="true" />}
            title={isLoading ? "邮件详情加载中" : "请选择一封消息"}
          />
        )}
      </section>
    );
  }

  const hasExtractionValue = viewModel.extraction.value.trim().length > 0;
  const copyLabel = viewModel.extraction.type === "auth_code" ? "复制验证码" : "复制提取值";
  const extractionInsight = getExtractionInsight(viewModel);
  const ExtractionInsightIcon = extractionInsight.Icon as LucideIcon;

  return (
    <section aria-label="阅读与提取详情" className="panel workspace-card detail-panel inbox-detail-panel">
      <div className="panel-header workspace-card-header detail-panel-header">
        <p className="panel-kicker">邮件详情</p>
        <span className={`message-extraction-chip ${viewModel.extractionChip.tone}`}>{viewModel.extractionChip.primary}</span>
      </div>
      {errorMessage ? (
        <div className="error-banner" role="alert">
          <span>{errorMessage}</span>
          {onRetry ? (
            <Button onClick={onRetry} size="sm" variant="secondary">
              重试加载详情
            </Button>
          ) : null}
        </div>
      ) : null}
      {isLoading ? <p className="empty-state workspace-inline-empty" aria-live="polite">正在加载邮件详情...</p> : null}
      <div className="detail-panel-actions" aria-label="邮件详情操作栏">
        <h2 className="detail-panel-subject" title={viewModel.subject}>
          {viewModel.subject}
        </h2>
        <div className="detail-panel-action-group" aria-label="邮件详情操作">
          <DetailActionButton
            icon={<ClipboardCopy size={17} strokeWidth={1.9} aria-hidden="true" />}
            isDisabled={!hasExtractionValue}
            label={copyLabel}
            onClick={() => void navigator.clipboard?.writeText(viewModel.extraction.value)}
            variant="primary"
          />
          <DetailActionButton
            icon={<ExternalLink size={17} strokeWidth={1.9} aria-hidden="true" />}
            label="打开原始邮件"
            onClick={() => openMessageResource(`/api/mail/messages/${viewModel.id}`)}
            variant="secondary"
          />
          <DetailActionButton
            icon={<FileJson size={17} strokeWidth={1.9} aria-hidden="true" />}
            label="查看提取 JSON"
            onClick={() => openMessageResource(`/api/mail/messages/${viewModel.id}`)}
            variant="ghost"
          />
        </div>
      </div>
      <div className="detail-meta workspace-meta-row">
        <span>发件人：{viewModel.fromAddress}</span>
        <span>{viewModel.receivedAtLabel}</span>
      </div>
      <div className="extraction-card" aria-label="邮件识别结果">
        <div className="extraction-card-primary">
          <p>
            <ExtractionInsightIcon size={20} strokeWidth={1.9} aria-hidden="true" />
            <span>{extractionInsight.label}</span>
          </p>
          <strong className={`extraction-card-value extraction-card-value-${extractionInsight.kind}`} title={extractionInsight.value}>
            {extractionInsight.value}
          </strong>
        </div>
        <div className="extraction-confidence" aria-label={`置信度 ${extractionInsight.confidence}%`}>
          <div className="extraction-confidence-copy">
            <span>置信度</span>
            <strong>{extractionInsight.confidence}%</strong>
          </div>
          <span className="extraction-confidence-track" aria-hidden="true">
            <span className="extraction-confidence-fill" style={{ width: `${extractionInsight.confidence}%` }} />
          </span>
        </div>
      </div>
      {viewModel.oversizeStatus ? <div className="warning-card">超大邮件处理：{viewModel.oversizeStatus}</div> : null}
      <pre className="message-body">{viewModel.bodyText}</pre>
      <div className="attachment-grid">
        {viewModel.attachments.map((attachment) => (
          <a key={attachment.id} href={`/api/mail/messages/${viewModel.id}/attachments/${attachment.id}`} target="_blank" rel="noreferrer">
            <Paperclip size={15} strokeWidth={1.9} aria-hidden="true" />
            {attachment.filename}
            <small>{attachment.sizeLabel}</small>
          </a>
        ))}
        {viewModel.attachments.length === 0 ? <p className="empty-state workspace-inline-empty">这封邮件没有附件。</p> : null}
      </div>
    </section>
  );
}
