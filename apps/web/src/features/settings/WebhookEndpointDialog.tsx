import { useMemo } from "react";
import { ListChecks } from "lucide-react";

import { Button } from "../../shared/button";
import { CheckboxField, FormField, TextInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { webhookEventGroups, type WebhookEndpointDialogProps } from "./webhook-content";

export function WebhookEndpointDialog({
  createDraft,
  errorMessage,
  isCreateDraftValid,
  isEditingEndpoint,
  isSaving,
  onDraftChange,
  onClose,
  onSubmit
}: WebhookEndpointDialogProps) {
  const createDraftEventSet = useMemo(() => new Set(createDraft.events), [createDraft.events]);

  function handleToggleEvent(value: string, checked: boolean) {
    // Set semantics, like the pre-split toggleCreateEvent: checking is
    // idempotent (no duplicate ids) and unchecking removes every occurrence.
    onDraftChange((current) => ({
      ...current,
      events: checked
        ? Array.from(new Set([...current.events, value]))
        : current.events.filter((eventValue) => eventValue !== value)
    }));
  }

  return (
        <OverlayDialog
          className="webhook-create-dialog"
          closeOnBackdrop
          description={isEditingEndpoint ? "调整端点名称、Callback URL、启用状态和事件订阅。" : "填写端点名称、Callback URL，并选择这个端点要接收的事件。"}
          eyebrow="端点配置"
          footer={
            <div className="workspace-dialog-actions integration-inline-actions webhook-dialog-actions">
              <Button
                disabled={isSaving}
                onClick={onClose}
                variant="secondary"
              >
                取消
              </Button>
              <Button
                disabled={!isCreateDraftValid}
                form="webhook-create-endpoint-form"
                isLoading={isSaving}
                loadingLabel={isEditingEndpoint ? "更新中" : "创建中"}
                type="submit"
                variant="primary"
              >
                {isEditingEndpoint ? "确认更新" : "创建端点"}
              </Button>
            </div>
          }
          onClose={onClose}
          size="lg"
          title={isEditingEndpoint ? "编辑端点" : "新增端点"}
        >
          <form
            className="webhook-create-form"
            id="webhook-create-endpoint-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {errorMessage ? (
              <p className="error-banner webhook-dialog-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="webhook-editor-grid">
              <FormField htmlFor="webhook-create-name" label="端点名称">
                <TextInput
                  id="webhook-create-name"
                  onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))}
                  placeholder="输入端点名称"
                  value={createDraft.name}
                />
              </FormField>
              <FormField htmlFor="webhook-create-url" label="Callback URL">
                <TextInput
                  id="webhook-create-url"
                  onChange={(event) => onDraftChange((current) => ({ ...current, url: event.target.value }))}
                  placeholder="输入接收 Webhook 的 HTTPS 地址"
                  value={createDraft.url}
                />
              </FormField>
            </div>

            <CheckboxField
              checked={createDraft.enabled}
              className="webhook-enabled-card"
              description="暂停后会保留配置和签名密钥，但不会继续投递事件。"
              label={isEditingEndpoint ? "启用这个 Webhook 端点" : "创建后启用这个 Webhook 端点"}
              onChange={(event) => onDraftChange((current) => ({ ...current, enabled: event.target.checked }))}
              variant="card"
            />

            <div className="webhook-create-events">
              <div className="webhook-panel-title">
                <ListChecks size={16} strokeWidth={1.9} />
                <strong>事件订阅</strong>
              </div>
              <div className="webhook-event-matrix">
                {webhookEventGroups.map((group) => (
                  <article className="webhook-event-group" key={group.title}>
                    <div>
                      <strong>{group.title}</strong>
                      <p>{group.description}</p>
                    </div>
                    <div className="webhook-event-list">
                      {group.events.map((event) => (
                        <CheckboxField
                          checked={createDraftEventSet.has(event.value)}
                          className="webhook-event-option"
                          description={<code>{event.value}</code>}
                          key={event.value}
                          label={event.label}
                          onChange={(changeEvent) => handleToggleEvent(event.value, changeEvent.target.checked)}
                          variant="card"
                        />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </form>
        </OverlayDialog>
  );
}
