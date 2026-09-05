import { RotateCw } from "lucide-react";

import { Button } from "../../shared/button";
import { WebhookCodeBlock } from "./WebhookCodeBlock";
import { OverlayDialog } from "../../shared/overlay";
import {
  formatDate,
  formatJson,
  getEventLabel,
  isSuccessfulDelivery,
  normalizeStatus,
  type WebhookDeliveryDialogProps
} from "./webhook-content";

export function WebhookDeliveryDialog({
  copiedToken,
  delivery,
  isDeliveryLoading,
  onClose,
  onCopy,
  onRetry
}: WebhookDeliveryDialogProps) {
  return (
        <OverlayDialog
          className="webhook-create-dialog webhook-delivery-dialog"
          closeOnBackdrop
          description="查看本次投递的事件、状态、Payload 和目标服务响应。"
          eyebrow="投递详情"
          footer={
            <div className="workspace-dialog-actions integration-inline-actions webhook-dialog-actions">
              {!isSuccessfulDelivery(delivery) ? (
                <Button
                  disabled={isDeliveryLoading}
                  leadingIcon={<RotateCw size={15} strokeWidth={1.9} />}
                  onClick={() => void onRetry(delivery)}
                  variant="secondary"
                >
                  重试投递
                </Button>
              ) : null}
              <Button onClick={onClose} variant="primary">
                关闭
              </Button>
            </div>
          }
          onClose={onClose}
          size="lg"
          title={getEventLabel(delivery.eventType)}
        >
          <div className="webhook-delivery-detail-grid">
            <article className="integration-stat-row">
              <strong>投递状态</strong>
              <span>{normalizeStatus(delivery.status)}</span>
            </article>
            <article className="integration-stat-row">
              <strong>状态码</strong>
              <span>{delivery.statusCode ?? "无状态码"}</span>
            </article>
            <article className="integration-stat-row">
              <strong>耗时</strong>
              <span>{delivery.durationMs === null ? "未记录耗时" : `${delivery.durationMs} ms`}</span>
            </article>
            <article className="integration-stat-row">
              <strong>创建时间</strong>
              <span>{formatDate(delivery.createdAt)}</span>
            </article>
          </div>
          {delivery.errorText ? (
            <p className="error-banner webhook-error-banner" role="alert">
              {delivery.errorText}
            </p>
          ) : null}
          <div className="webhook-reference-grid">
            <WebhookCodeBlock
              copied={copiedToken === "delivery-payload"}
              copyLabel="复制投递 Payload"
              label="Payload"
              onCopy={() => void onCopy("delivery-payload", formatJson(delivery.payload))}
              value={formatJson(delivery.payload)}
            />
            <WebhookCodeBlock
              copied={copiedToken === "delivery-response"}
              copyLabel="复制目标响应"
              label="Response"
              onCopy={() => void onCopy("delivery-response", delivery.responseText ?? "")}
              value={delivery.responseText || "目标服务没有返回响应体。"}
            />
          </div>
        </OverlayDialog>
  );
}
