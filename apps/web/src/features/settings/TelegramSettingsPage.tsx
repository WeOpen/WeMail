import { useEffect, useState } from "react";

import type { TelegramSubscriptionSummary } from "@wemail/shared";
import { CheckboxField, FormField, TextInput } from "../../shared/form";

import { IntegrationChoiceCard, SettingsSupportCard } from "./SettingsSupport";

type SaveTelegramPayload = {
  chatId: string;
  enabled: boolean;
};

type TelegramSettingsPageProps = {
  telegram: TelegramSubscriptionSummary | null;
  onSaveTelegram: (payload: SaveTelegramPayload) => Promise<void>;
};

const preferenceGroups = [
  {
    title: "邮件通知",
    items: ["新邮件到达", "提取结果完成", "邮件处理失败"]
  },
  {
    title: "安全与账号通知",
    items: ["API 密钥创建", "API 密钥吊销", "异常风险提醒"]
  },
  {
    title: "系统通知",
    items: ["Webhook 连续失败", "平台重要公告", "功能状态异常"]
  }
] as const;

export function TelegramSettingsPage({ telegram, onSaveTelegram }: TelegramSettingsPageProps) {
  const [chatId, setChatId] = useState(telegram?.chatId ?? "");
  const [enabled, setEnabled] = useState(telegram?.enabled ?? false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setChatId(telegram?.chatId ?? "");
    setEnabled(telegram?.enabled ?? false);
  }, [telegram]);

  const handleSubmit = async () => {
    const nextChatId = chatId.trim();
    if (!nextChatId) return;
    setIsSaving(true);
    try {
      await onSaveTelegram({ chatId: nextChatId, enabled });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="workspace-grid integration-page-grid">
      <div className="integration-primary-column">
        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="workspace-card-header">
            <div className="integration-card-copy">
              <p className="panel-kicker">个人通知</p>
              <h2>Telegram 绑定</h2>
              <p className="section-copy">把 WeMail 的关键动态直接送到你的 Telegram。适合个人即时提醒，不适合系统对系统集成。</p>
            </div>
            <button className="workspace-action-button secondary" disabled type="button">
              发送测试通知（即将开放）
            </button>
          </div>

          <div className="integration-binding-state">
            <article className="integration-binding-chip">
              <strong>{telegram ? "已连接到 Telegram" : "尚未绑定 Telegram"}</strong>
              <span>{telegram ? `Chat ${telegram.chatId}` : "先和 WeMail Bot 建立会话，再填写 Chat ID。"}</span>
            </article>
            <article className="integration-binding-chip">
              <strong>{enabled ? "通知已启用" : "通知已暂停"}</strong>
              <span>{enabled ? "保存后会继续接收绑定 Chat 的个人通知。" : "你可以先完成绑定，稍后再打开提醒。"}</span>
            </article>
          </div>

          <div className="integration-steps-grid">
            <article className="integration-step-card">
              <strong>1. 打开 WeMail Bot</strong>
              <span>先在 Telegram 中打开机器人，建立一对一会话。</span>
            </article>
            <article className="integration-step-card">
              <strong>2. 向 Bot 发送 /start</strong>
              <span>没有先发送 /start，机器人通常无法主动给你发消息。</span>
            </article>
            <article className="integration-step-card">
              <strong>3. 粘贴你的 Chat ID</strong>
              <span>保存成功后，WeMail 会把个人通知发送到这个 Chat。</span>
            </article>
          </div>

          <FormField className="integration-form-grid" htmlFor="telegram-chat-id" label="Chat ID">
            <TextInput id="telegram-chat-id" name="chatId" onChange={(event) => setChatId(event.target.value)} value={chatId} />
          </FormField>
          <CheckboxField checked={enabled} label="启用 Telegram 通知" name="enabled" onChange={(event) => setEnabled(event.target.checked)} />

          <div className="integration-inline-actions">
            <button className="workspace-action-button primary" disabled={isSaving || chatId.trim().length === 0} onClick={() => void handleSubmit()} type="button">
              {isSaving ? "保存中..." : "保存 Telegram 设置"}
            </button>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">未来扩展</p>
            <h3>通知偏好</h3>
            <p className="section-copy">第一版先把“绑定 + 开关”做扎实，后续再把细粒度偏好真正接到服务端。</p>
          </div>
          <div className="integration-event-group-list">
            {preferenceGroups.map((group) => (
              <article className="integration-event-group" key={group.title}>
                <strong>{group.title}</strong>
                <div className="integration-event-pill-list">
                  {group.items.map((item, index) => (
                    <CheckboxField className="integration-event-pill" defaultChecked={index < 2} disabled key={item} label={item} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">打扰控制</p>
            <h3>打扰控制</h3>
            <p className="section-copy">静默时段、仅高优先级通知和每日摘要都值得预留在这一页，不要把 Telegram 页面做成只有一个 Chat ID 的表单。</p>
          </div>
          <div className="integration-two-up-grid compact">
            <FormField className="integration-detail-card" htmlFor="quiet-hours" label="静默时段">
              <TextInput disabled id="quiet-hours" value="23:00 - 08:00" />
            </FormField>
            <CheckboxField className="integration-detail-card" defaultChecked disabled label="静默时段仅保留高优先级通知" variant="card" />
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">验证</p>
            <h3>测试通知</h3>
            <p className="section-copy">测试接口接入后，这里会给你一条真实消息发送结果，用来确认 Chat ID、机器人权限和网络状态都正常。</p>
          </div>
          <div className="integration-inline-actions">
            <button className="workspace-action-button secondary" disabled type="button">
              测试接口即将开放
            </button>
          </div>
        </section>

        <section className="panel workspace-card page-panel integration-surface-card">
          <div className="integration-card-copy">
            <p className="panel-kicker">最近活动</p>
            <h3>最近通知记录</h3>
          </div>
          <div className="integration-empty-state compact">
            <strong>{telegram ? "已记录当前绑定状态" : "完成绑定后，这里会显示最近通知记录"}</strong>
            <p className="section-copy">{telegram ? `当前绑定 Chat ${telegram.chatId}，通知${telegram.enabled ? "已启用" : "已暂停"}。` : "通知日志接口接入后，你可以直接在这里看到最近一次成功或失败的发送记录。"}</p>
          </div>
        </section>
      </div>

      <aside className="integration-secondary-column">
        <SettingsSupportCard kicker="当前状态" title="通知状态概览" description="把用户最关心的几个状态直接放在右侧，不用翻文档或猜当前配置是否生效。">
          <div className="integration-stat-list">
            <article className="integration-stat-row">
              <strong>绑定状态</strong>
              <span>{telegram ? "已绑定" : "未绑定"}</span>
            </article>
            <article className="integration-stat-row">
              <strong>通知开关</strong>
              <span>{enabled ? "已启用" : "已暂停"}</span>
            </article>
            <article className="integration-stat-row">
              <strong>测试消息</strong>
              <span>即将开放</span>
            </article>
          </div>
        </SettingsSupportCard>

        <SettingsSupportCard kicker="绑定说明" title="绑定说明" description="Telegram 更适合个人即时提醒。如果你要把事件推给自己的服务，请切到 Webhook。">
          <ul className="integration-bullet-list">
            <li>先和 WeMail Bot 发送 /start，再保存 Chat ID。</li>
            <li>Chat ID 保存后即可成为默认个人通知目标。</li>
            <li>后续可继续在这里细分通知偏好与打扰控制。</li>
          </ul>
        </SettingsSupportCard>

        <IntegrationChoiceCard current="telegram" />
      </aside>
    </main>
  );
}
