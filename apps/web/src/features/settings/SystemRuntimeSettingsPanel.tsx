import { useEffect, useMemo, useState } from "react";
import { Gauge, HardDrive, Save, Sparkles, TimerReset } from "lucide-react";
import type { RuntimeSettings, RuntimeSettingsUpdateInput } from "@wemail/shared";

import { Badge } from "../../shared/badge";
import { Button } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";

type SystemRuntimeSettingsPanelProps = {
  runtimeSettings: RuntimeSettings | null;
  onSaveRuntimeSettings: (payload: RuntimeSettingsUpdateInput) => Promise<void>;
};

type RuntimeDraft = {
  aiFallbackLimit: number;
  apiDailyLimit: number;
  mailboxLimit: number;
  maxAttachmentMb: number;
  maxTotalAttachmentMb: number;
  messageRetentionDays: number;
  outboundDailyLimit: number;
};

function bytesToMb(value: number) {
  return Math.max(1, Math.round(value / 1024 / 1024));
}

function mbToBytes(value: number) {
  return Math.max(1, Math.trunc(value)) * 1024 * 1024;
}

function toDraft(settings: RuntimeSettings): RuntimeDraft {
  return {
    aiFallbackLimit: settings.ai.fallbackLimit,
    apiDailyLimit: settings.api.dailyLimit,
    mailboxLimit: settings.mailbox.limit,
    maxAttachmentMb: bytesToMb(settings.attachments.maxBytes),
    maxTotalAttachmentMb: bytesToMb(settings.attachments.maxTotalBytes),
    messageRetentionDays: settings.message.retentionDays,
    outboundDailyLimit: settings.outbound.dailyLimit
  };
}

function readPositiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.trunc(parsed);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatMb(value: number) {
  return `${formatNumber(value)} MB`;
}

export function SystemRuntimeSettingsPanel({
  runtimeSettings,
  onSaveRuntimeSettings
}: SystemRuntimeSettingsPanelProps) {
  const [draft, setDraft] = useState<RuntimeDraft | null>(() => (runtimeSettings ? toDraft(runtimeSettings) : null));
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    if (!runtimeSettings) return;
    setDraft(toDraft(runtimeSettings));
    setErrorText(null);
  }, [runtimeSettings]);

  const totalAttachmentIsValid = useMemo(() => {
    if (!draft) return true;
    return draft.maxTotalAttachmentMb >= draft.maxAttachmentMb;
  }, [draft]);

  function updateDraft(field: keyof RuntimeDraft, value: string) {
    setStatusText(null);
    setErrorText(null);
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: readPositiveNumber(value, current[field])
      };
    });
  }

  async function saveRuntimeSettings() {
    if (!draft) return;
    if (!totalAttachmentIsValid) {
      setErrorText("单封邮件附件总量不能小于单个附件上限。");
      return;
    }

    setIsSaving(true);
    setErrorText(null);
    setStatusText(null);
    try {
      await onSaveRuntimeSettings({
        ai: { fallbackLimit: draft.aiFallbackLimit },
        api: { dailyLimit: draft.apiDailyLimit },
        attachments: {
          maxBytes: mbToBytes(draft.maxAttachmentMb),
          maxTotalBytes: mbToBytes(draft.maxTotalAttachmentMb)
        },
        mailbox: { limit: draft.mailboxLimit },
        message: { retentionDays: draft.messageRetentionDays },
        outbound: { dailyLimit: draft.outboundDailyLimit }
      });
      setStatusText("运行策略已保存。");
    } catch {
      setErrorText("运行策略保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  if (!runtimeSettings || !draft) {
    return (
      <section className="panel workspace-card page-panel system-runtime-settings-panel">
        <div className="system-settings-section-head">
          <div>
            <p className="panel-kicker">运行策略</p>
            <h2>业务默认值</h2>
          </div>
          <Badge variant="neutral">加载中</Badge>
        </div>
        <p className="empty-state">正在加载运行策略...</p>
      </section>
    );
  }

  return (
    <section className="panel workspace-card page-panel system-runtime-settings-panel">
      <div className="system-settings-section-head">
        <div>
          <p className="panel-kicker">运行策略</p>
          <h2>业务默认值</h2>
        </div>
        <Badge variant="brand">D1 配置</Badge>
      </div>

      <div className="system-runtime-summary-grid" role="list" aria-label="运行策略概览">
        <div className="system-runtime-summary-card" role="listitem">
          <Gauge size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>默认外发</span>
          <strong>{formatNumber(draft.outboundDailyLimit)} / 天</strong>
        </div>
        <div className="system-runtime-summary-card" role="listitem">
          <TimerReset size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>消息保留</span>
          <strong>{formatNumber(draft.messageRetentionDays)} 天</strong>
        </div>
        <div className="system-runtime-summary-card" role="listitem">
          <HardDrive size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>附件总量</span>
          <strong>{formatMb(draft.maxTotalAttachmentMb)}</strong>
        </div>
        <div className="system-runtime-summary-card" role="listitem">
          <Sparkles size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>AI fallback</span>
          <strong>{formatNumber(draft.aiFallbackLimit)} / 天</strong>
        </div>
      </div>

      <div className="system-runtime-settings-grid">
        <FormField description="新用户可创建的邮箱数量上限。" label="邮箱数量上限">
          <TextInput
            min={1}
            onChange={(event) => updateDraft("mailboxLimit", event.target.value)}
            type="number"
            value={draft.mailboxLimit}
          />
        </FormField>
        <FormField description="入站邮件自动过期清理天数。" label="消息保留天数">
          <TextInput
            min={1}
            onChange={(event) => updateDraft("messageRetentionDays", event.target.value)}
            type="number"
            value={draft.messageRetentionDays}
          />
        </FormField>
        <FormField description="新用户注册或管理员新建用户时写入的默认发送额度，单个用户仍可单独覆盖。" label="邮箱每日邮件发送上限">
          <TextInput
            min={1}
            onChange={(event) => updateDraft("outboundDailyLimit", event.target.value)}
            type="number"
            value={draft.outboundDailyLimit}
          />
        </FormField>
        <FormField description="新用户注册或管理员新建用户时写入的默认 API 额度，单个用户仍可单独覆盖。" label="每日 API 调用上限">
          <TextInput
            min={1}
            onChange={(event) => updateDraft("apiDailyLimit", event.target.value)}
            type="number"
            value={draft.apiDailyLimit}
          />
        </FormField>
        <FormField description="单个附件允许的最大体积。" label="单个附件上限 MB">
          <TextInput
            min={1}
            onChange={(event) => updateDraft("maxAttachmentMb", event.target.value)}
            type="number"
            value={draft.maxAttachmentMb}
          />
        </FormField>
        <FormField
          description="单封邮件所有附件合计体积。"
          label="附件总量上限 MB"
          message={!totalAttachmentIsValid ? "不能小于单个附件上限。" : undefined}
          tone={!totalAttachmentIsValid ? "error" : "default"}
        >
          <TextInput
            min={1}
            onChange={(event) => updateDraft("maxTotalAttachmentMb", event.target.value)}
            type="number"
            value={draft.maxTotalAttachmentMb}
          />
        </FormField>
        <FormField description="每天允许触发 AI fallback 提取的次数。" label="AI fallback 次数">
          <TextInput
            min={1}
            onChange={(event) => updateDraft("aiFallbackLimit", event.target.value)}
            type="number"
            value={draft.aiFallbackLimit}
          />
        </FormField>
      </div>

      {errorText ? (
        <p className="form-message system-runtime-message" data-tone="error" role="alert">
          {errorText}
        </p>
      ) : null}
      {statusText ? (
        <p className="form-message system-runtime-message" data-tone="success" role="status">
          {statusText}
        </p>
      ) : null}

      <div className="system-runtime-actions">
        <span>最后更新：{runtimeSettings.lastUpdatedLabel}</span>
        <Button
          className="system-runtime-save-button"
          disabled={isSaving || !totalAttachmentIsValid}
          isLoading={isSaving}
          leadingIcon={<Save size={16} strokeWidth={1.9} aria-hidden="true" />}
          loadingLabel="保存中"
          onClick={() => void saveRuntimeSettings()}
          variant="primary"
        >
          {isSaving ? "保存中" : "保存运行策略"}
        </Button>
      </div>
    </section>
  );
}
