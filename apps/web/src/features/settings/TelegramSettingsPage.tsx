import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Bot,
  CheckCircle2,
  CirclePause,
  ClipboardCheck,
  ExternalLink,
  KeyRound,
  MessageCircle,
  Radio,
  RefreshCw,
  Send,
  type LucideIcon
} from "lucide-react";

import type {
  TelegramDeliverySummary,
  TelegramLinkCodeSummary,
  TelegramOverviewSummary,
  TelegramTestMessageResult
} from "@wemail/shared";
import { Button, ButtonAnchor } from "../../shared/button";
import { CopyButton } from "../../shared/copy-button";
import { CheckboxField, FormField, TextInput } from "../../shared/form";

import type { TelegramWebhookConfigureResult } from "./api";
import { SettingsSupportCard } from "./SettingsSupport";

type SaveTelegramPayload = {
  chatId: string;
  enabled: boolean;
};

type TelegramSettingsPageProps = {
  canConfigureBotMenu: boolean;
  deliveries: TelegramDeliverySummary[];
  overview: TelegramOverviewSummary;
  onConfigureBotMenu: () => Promise<unknown>;
  onConfigureWebhook: () => Promise<TelegramWebhookConfigureResult>;
  onCreateTelegramLinkCode: () => Promise<TelegramLinkCodeSummary>;
  onRefreshTelegram: () => Promise<void>;
  onSaveTelegram: (payload: SaveTelegramPayload) => Promise<void>;
  onSendTelegramTest: () => Promise<TelegramTestMessageResult>;
};

type StatusTone = "accent" | "info" | "success" | "warning";

type TelegramStatusCard = {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: StatusTone;
  value: string;
};

const setupSteps = [
  {
    title: "打开 WeMail Bot",
    description: "进入 Telegram 私聊会话，确认目标账号就是接收通知的人。"
  },
  {
    title: "发送 /start",
    description: "先建立会话权限，机器人才能向这个 Chat 主动推送消息。"
  },
  {
    title: "保存 Chat ID",
    description: "把 Chat ID 写入 WeMail 后，个人通知会发送到这个目标。"
  }
] as const;

function TelegramStatusCard({ card }: { card: TelegramStatusCard }) {
  const StatusIcon = card.icon;

  return (
    <article className="panel workspace-card telegram-status-card" data-tone={card.tone}>
      <span className="telegram-status-icon" aria-hidden="true">
        <StatusIcon absoluteStrokeWidth strokeWidth={1.8} />
      </span>
      <div className="telegram-status-copy">
        <span>{card.label}</span>
        <strong>{card.value}</strong>
        <small>{card.detail}</small>
      </div>
    </article>
  );
}

function formatTelegramTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function TelegramSettingsPage({
  canConfigureBotMenu,
  deliveries,
  overview,
  onConfigureBotMenu,
  onConfigureWebhook,
  onCreateTelegramLinkCode,
  onRefreshTelegram,
  onSaveTelegram,
  onSendTelegramTest
}: TelegramSettingsPageProps) {
  const resolvedOverview = overview;
  const subscription = resolvedOverview.subscription;
  const [chatId, setChatId] = useState(subscription?.chatId ?? "");
  const [enabled, setEnabled] = useState(subscription?.enabled ?? false);
  const [linkCode, setLinkCode] = useState<TelegramLinkCodeSummary | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isCreatingLinkCode, setIsCreatingLinkCode] = useState(false);
  const [isRefreshingTelegram, setIsRefreshingTelegram] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<TelegramTestMessageResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isConfiguringBotMenu, setIsConfiguringBotMenu] = useState(false);
  const [botMenuMessage, setBotMenuMessage] = useState<string | null>(null);
  const [botMenuError, setBotMenuError] = useState<string | null>(null);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  useEffect(() => {
    setChatId(subscription?.chatId ?? "");
    setEnabled(subscription?.enabled ?? false);
    setLinkCode(null);
    setLinkError(null);
    setTestResult(null);
    setTestError(null);
    setBotMenuMessage(null);
    setBotMenuError(null);
    setWebhookMessage(null);
    setWebhookError(null);
  }, [subscription]);

  const savedChatId = subscription?.chatId ?? "";
  const trimmedChatId = chatId.trim();
  const hasSavedBinding = savedChatId.length > 0;
  const hasDraftBinding = trimmedChatId.length > 0;
  const hasUnsavedChanges = trimmedChatId !== savedChatId || enabled !== (subscription?.enabled ?? false);
  const connectionLabel = hasSavedBinding ? `Chat ${savedChatId}` : "等待 Chat ID";
  const notificationLabel = enabled ? "通知已启用" : "通知已暂停";
  const readinessLabel = !hasDraftBinding ? "填写 Chat ID 后可保存" : hasUnsavedChanges ? "有未保存改动" : "当前配置已同步";
  const enabledEventCount = resolvedOverview.supportedEvents.filter((event) => event.enabled).length;
  const eventCountLabel = `${enabledEventCount} 项`;
  const canSendSavedTest = resolvedOverview.canSendTest && !hasUnsavedChanges;
  const testHelpText = !resolvedOverview.featureEnabled
    ? "管理员已停用 Telegram 功能。"
    : !resolvedOverview.botConfigured
      ? "后端尚未配置 Telegram Bot Token。"
      : !hasSavedBinding
        ? "保存 Chat ID 后可发送真实测试消息。"
        : hasUnsavedChanges
          ? "保存当前改动后可发送测试消息。"
        : !enabled
          ? "开启通知后可发送真实测试消息。"
          : "发送一条由后端 Telegram Bot 投递的真实测试消息。";
  const testStatusTitle = testError
    ? "测试消息发送失败"
    : testResult
      ? testResult.delivered
        ? "测试消息已发送"
        : "测试消息发送失败"
      : hasSavedBinding
        ? "等待发送测试通知"
        : "完成绑定后可发送测试通知";
  const testStatusDescription = testError
    ? `后端返回：${testError}`
    : testResult
      ? testResult.delivered
        ? `后端已在 ${testResult.attemptedAt} 向 Chat ${savedChatId} 发送测试消息。`
        : `后端已尝试发送，但 Telegram 返回失败：${testResult.reason ?? "unknown"}。`
      : testHelpText;
  const canRunBotMenuSetup = canConfigureBotMenu && resolvedOverview.featureEnabled && resolvedOverview.botConfigured;
  const canRunWebhookSetup = canConfigureBotMenu && resolvedOverview.featureEnabled && resolvedOverview.botConfigured;
  const botMenuHelpText = !resolvedOverview.featureEnabled
    ? "Telegram 功能开启后可配置 Bot 菜单。"
    : !resolvedOverview.botConfigured
      ? "后端配置 Bot Token 后可写入 Telegram 命令菜单。"
      : "把 /status、/accounts、/messages 等命令写入 Telegram Bot 菜单。";
  const webhookHelpText = !resolvedOverview.featureEnabled
    ? "Telegram 功能开启后可配置 webhook。"
    : !resolvedOverview.botConfigured
      ? "后端配置 Bot Token 后可把当前 API 域名写入 Telegram webhook。"
      : "把当前 API 域名写入 Telegram webhook，用于接收绑定码和 Bot 命令。";

  const statusCards: TelegramStatusCard[] = [
    {
      detail: hasSavedBinding ? connectionLabel : "先完成 Bot 会话",
      icon: hasSavedBinding ? CheckCircle2 : MessageCircle,
      label: "绑定状态",
      tone: hasSavedBinding ? "success" : "warning",
      value: hasSavedBinding ? "已绑定" : "待绑定"
    },
    {
      detail: hasDraftBinding ? "保存后影响个人通知" : "等待绑定目标",
      icon: enabled ? Bell : CirclePause,
      label: "通知开关",
      tone: enabled ? "accent" : "info",
      value: enabled ? "已启用" : "已暂停"
    },
    {
      detail: resolvedOverview.botConfigured ? "Bot Token 已可用" : "等待后端配置",
      icon: Bot,
      label: "Bot 状态",
      tone: resolvedOverview.botConfigured ? "success" : "warning",
      value: resolvedOverview.botConfigured ? "已配置" : "未配置"
    },
    {
      detail: `${resolvedOverview.supportedEvents.length} 个后端事件`,
      icon: Bell,
      label: "通知事件",
      tone: "info",
      value: eventCountLabel
    }
  ];

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const nextChatId = chatId.trim();
    if (!nextChatId) return;
    setIsSaving(true);
    try {
      await onSaveTelegram({ chatId: nextChatId, enabled });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLinkCode = async () => {
    setIsCreatingLinkCode(true);
    try {
      const nextLinkCode = await onCreateTelegramLinkCode();
      setLinkCode(nextLinkCode);
      setLinkError(null);
    } catch (error) {
      setLinkCode(null);
      setLinkError(error instanceof Error ? error.message : "Telegram link code failed");
    } finally {
      setIsCreatingLinkCode(false);
    }
  };

  const handleRefreshTelegram = async () => {
    setIsRefreshingTelegram(true);
    try {
      await onRefreshTelegram();
    } finally {
      setIsRefreshingTelegram(false);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      const result = await onSendTelegramTest();
      setTestResult(result);
      setTestError(null);
    } catch (error) {
      setTestResult(null);
      setTestError(error instanceof Error ? error.message : "Telegram test message failed");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleConfigureBotMenu = async () => {
    setIsConfiguringBotMenu(true);
    try {
      await onConfigureBotMenu();
      setBotMenuMessage("Bot 菜单已配置");
      setBotMenuError(null);
    } catch (error) {
      setBotMenuMessage(null);
      setBotMenuError(error instanceof Error ? error.message : "Telegram bot menu configuration failed");
    } finally {
      setIsConfiguringBotMenu(false);
    }
  };

  const handleConfigureWebhook = async () => {
    setIsConfiguringWebhook(true);
    try {
      const result = await onConfigureWebhook();
      setWebhookMessage(`Webhook 已配置：${result.url}`);
      setWebhookError(null);
    } catch (error) {
      setWebhookMessage(null);
      setWebhookError(error instanceof Error ? error.message : "Telegram webhook configuration failed");
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  return (
    <main className="workspace-grid telegram-page-grid">
      <section className="telegram-status-grid" aria-label="Telegram 通知状态">
        {statusCards.map((card) => (
          <TelegramStatusCard card={card} key={card.label} />
        ))}
      </section>

      <div className="telegram-control-grid">
        <section className="panel workspace-card page-panel integration-surface-card telegram-control-panel">
          <div className="workspace-card-header telegram-control-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">个人即时提醒</p>
              <h2>Telegram 通知控制台</h2>
              <p className="section-copy">把新邮件、识别结果和账号安全动态推到你的 Telegram 私聊，适合个人值守和临时任务提醒。</p>
            </div>
          </div>

          <div className="telegram-channel-banner" data-state={hasSavedBinding ? "connected" : "empty"}>
            <span className="telegram-channel-icon" aria-hidden="true">
              <Bot absoluteStrokeWidth strokeWidth={1.8} />
            </span>
            <div className="telegram-channel-copy">
              <strong>{hasSavedBinding ? connectionLabel : "尚未绑定 Telegram"}</strong>
              <span>{hasSavedBinding ? `${notificationLabel}，最近配置会在保存后立即生效。` : "先和 WeMail Bot 建立会话，再填写 Chat ID。"}</span>
            </div>
            <span className="integration-status-pill">{hasSavedBinding ? "已连接" : "待连接"}</span>
          </div>

          <form className="telegram-control-form" onSubmit={(event) => void handleSubmit(event)}>
            <FormField
              className="telegram-chat-field"
              description="只保存数字或频道标识本身，不需要粘贴 Telegram 链接。"
              htmlFor="telegram-chat-id"
              label="Chat ID"
              message={readinessLabel}
              required
              tone={!hasDraftBinding ? "default" : hasUnsavedChanges ? "error" : "success"}
            >
              <TextInput
                autoComplete="off"
                id="telegram-chat-id"
                inputMode="text"
                name="chatId"
                onChange={(event) => {
                  setChatId(event.target.value);
                  setTestResult(null);
                  setTestError(null);
                }}
                placeholder="例如 123456789"
                value={chatId}
              />
            </FormField>

            <CheckboxField
              checked={enabled}
              className="telegram-enable-row"
              description="关闭后保留绑定关系，只暂停发送个人提醒。"
              label="启用 Telegram 通知"
              name="enabled"
              onChange={(event) => {
                setEnabled(event.target.checked);
                setTestResult(null);
                setTestError(null);
              }}
            />

            <div className="telegram-form-actions">
              <Button
                disabled={!hasDraftBinding}
                isLoading={isSaving}
                leadingIcon={<ClipboardCheck size={16} strokeWidth={1.8} />}
                loadingLabel="保存中..."
                type="submit"
                variant="primary"
              >
                保存 Telegram 设置
              </Button>
              <span>{readinessLabel}</span>
            </div>
          </form>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card telegram-preferences-panel">
          <div className="workspace-card-header telegram-section-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">后端事件</p>
              <h3>通知事件</h3>
              <p className="section-copy">这里展示后端当前实际会发送到 Telegram 的事件，不再显示未接入的偏好项。</p>
            </div>
          </div>
          <div className="telegram-event-list">
            {resolvedOverview.supportedEvents.map((event) => (
              <article className="telegram-event-row" key={event.id}>
                <div className="telegram-event-copy">
                  <strong>{event.label}</strong>
                  <span>{event.description}</span>
                </div>
                <span className="integration-status-pill">{event.enabled ? "已启用" : "未启用"}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card telegram-delivery-panel">
          <div className="workspace-card-header telegram-section-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">验证</p>
              <h3>测试通知</h3>
              <p className="section-copy">{testHelpText}</p>
            </div>
            <Button
              disabled={!canSendSavedTest}
              isLoading={isSendingTest}
              leadingIcon={<Radio size={16} strokeWidth={1.8} />}
              loadingLabel="发送中..."
              onClick={() => void handleSendTest()}
              variant="secondary"
            >
              发送测试通知
            </Button>
          </div>

          <div className="telegram-activity-row" aria-live="polite">
            <span className="telegram-activity-icon" aria-hidden="true">
              <MessageCircle absoluteStrokeWidth strokeWidth={1.8} />
            </span>
            <div className="telegram-activity-copy">
              <strong>{testStatusTitle}</strong>
              <p className="section-copy">{testStatusDescription}</p>
            </div>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card telegram-history-panel">
          <div className="workspace-card-header telegram-section-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">投递记录</p>
              <h3>最近投递</h3>
              <p className="section-copy">测试通知和后端真实事件都会记录在这里，便于确认最近一次是否送达。</p>
            </div>
          </div>

          <div className="telegram-event-list">
            {deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <article className="telegram-event-row" key={delivery.id}>
                  <div className="telegram-event-copy">
                    <strong>{delivery.label}</strong>
                    <span>
                      {formatTelegramTimestamp(delivery.createdAt)}
                      {delivery.chatId ? ` · Chat ${delivery.chatId}` : ""}
                    </span>
                    {delivery.reason ? <span>{delivery.reason}</span> : null}
                  </div>
                  <span className="integration-status-pill">{delivery.delivered ? "已送达" : "失败"}</span>
                </article>
              ))
            ) : (
              <div className="telegram-activity-row">
                <span className="telegram-activity-icon" aria-hidden="true">
                  <Send absoluteStrokeWidth strokeWidth={1.8} />
                </span>
                <div className="telegram-activity-copy">
                  <strong>暂无投递记录</strong>
                  <p className="section-copy">发送测试通知或收到新邮件后，这里会出现最近的 Telegram 投递状态。</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="integration-secondary-column telegram-side-rail">
          {canConfigureBotMenu ? (
            <>
              <SettingsSupportCard kicker="管理员工具" title="Webhook 配置" description={webhookHelpText}>
                <div className="telegram-link-card">
                  <div className="telegram-link-actions">
                    <Button
                      disabled={!canRunWebhookSetup}
                      isLoading={isConfiguringWebhook}
                      leadingIcon={<Radio size={16} strokeWidth={1.8} />}
                      loadingLabel="配置中..."
                      onClick={() => void handleConfigureWebhook()}
                      variant="secondary"
                    >
                      配置 Webhook
                    </Button>
                  </div>
                  {webhookError ? (
                    <p className="telegram-link-error" role="alert">
                      {webhookError}
                    </p>
                  ) : null}
                  {webhookMessage ? (
                    <p className="form-message" data-tone="success" role="status">
                      {webhookMessage}
                    </p>
                  ) : null}
                </div>
              </SettingsSupportCard>

              <SettingsSupportCard kicker="管理员工具" title="Bot 菜单配置" description={botMenuHelpText}>
                <div className="telegram-link-card">
                  <div className="telegram-link-actions">
                    <Button
                      disabled={!canRunBotMenuSetup}
                      isLoading={isConfiguringBotMenu}
                      leadingIcon={<Bot size={16} strokeWidth={1.8} />}
                      loadingLabel="配置中..."
                      onClick={() => void handleConfigureBotMenu()}
                      variant="secondary"
                    >
                      配置 Bot 菜单
                    </Button>
                  </div>
                  {botMenuError ? (
                    <p className="telegram-link-error" role="alert">
                      {botMenuError}
                    </p>
                  ) : null}
                  {botMenuMessage ? (
                    <p className="form-message" data-tone="success" role="status">
                      {botMenuMessage}
                    </p>
                  ) : null}
                </div>
              </SettingsSupportCard>
            </>
          ) : null}

          <SettingsSupportCard kicker="自动绑定" title="Telegram 自动绑定" description="生成一次性命令后，在 Bot 私聊里发送即可完成当前账号绑定。">
            <div className="telegram-link-card">
              <div className="telegram-link-actions">
                <Button
                  disabled={!resolvedOverview.featureEnabled}
                  isLoading={isCreatingLinkCode}
                  leadingIcon={<KeyRound size={16} strokeWidth={1.8} />}
                  loadingLabel="生成中..."
                  onClick={() => void handleCreateLinkCode()}
                  variant="secondary"
                >
                  生成绑定码
                </Button>
                <Button
                  isLoading={isRefreshingTelegram}
                  leadingIcon={<RefreshCw size={16} strokeWidth={1.8} />}
                  loadingLabel="刷新中..."
                  onClick={() => void handleRefreshTelegram()}
                  variant="ghost"
                >
                  刷新绑定状态
                </Button>
              </div>

              {linkError ? (
                <p className="telegram-link-error" role="alert">
                  {linkError}
                </p>
              ) : null}

              {linkCode ? (
                <div className="telegram-link-code-block">
                  <span>有效期至 {formatTelegramTimestamp(linkCode.expiresAt)}</span>
                  <code>{linkCode.startCommand}</code>
                  <div className="telegram-link-actions">
                    {linkCode.deepLinkUrl ? (
                      <ButtonAnchor
                        href={linkCode.deepLinkUrl}
                        leadingIcon={<ExternalLink size={16} strokeWidth={1.8} />}
                        rel="noreferrer"
                        target="_blank"
                        variant="secondary"
                      >
                        打开 Telegram 绑定
                      </ButtonAnchor>
                    ) : null}
                    <CopyButton value={linkCode.startCommand}>复制绑定命令</CopyButton>
                  </div>
                </div>
              ) : (
                <p className="section-copy">绑定码 15 分钟内有效，生成后可直接打开 Telegram 或复制命令发送给 Bot。</p>
              )}
            </div>
          </SettingsSupportCard>

          <SettingsSupportCard kicker="绑定流程" title="绑定流程" description="完成这三步后，WeMail 才能把个人通知推到正确会话。">
            <ol className="telegram-step-list">
              {setupSteps.map((step, index) => (
                <li key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SettingsSupportCard>

          <SettingsSupportCard kicker="当前状态" title="通知状态概览" description="绑定目标、发送开关和保存状态分开看，排查时更快。">
            <div className="integration-stat-list">
              <article className="integration-stat-row">
                <strong>功能开关</strong>
                <span>{resolvedOverview.featureEnabled ? "已启用" : "已停用"}</span>
              </article>
              <article className="integration-stat-row">
                <strong>Bot 配置</strong>
                <span>{resolvedOverview.botConfigured ? "已配置" : "未配置"}</span>
              </article>
              <article className="integration-stat-row">
                <strong>保存状态</strong>
                <span>{hasUnsavedChanges ? "待保存" : "已同步"}</span>
              </article>
            </div>
          </SettingsSupportCard>
        </aside>
      </div>
    </main>
  );
}
