import type { FormEvent } from "react";

import type { TelegramSubscriptionSummary } from "@wemail/shared";

type TelegramPanelProps = {
  telegram: TelegramSubscriptionSummary | null;
  onSaveTelegram: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function TelegramPanel({ telegram, onSaveTelegram }: TelegramPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">通知路由</p>
      <h2>Telegram 通知</h2>
      <p className="section-copy">绑定 Chat ID 后，可将新邮件提醒同步到 Telegram。</p>
      <form className="composer-form" onSubmit={onSaveTelegram}>
        <label>
          Chat ID
          <input name="chatId" defaultValue={telegram?.chatId ?? ""} />
        </label>
        <label className="checkbox-row">
          <input name="enabled" type="checkbox" defaultChecked={telegram?.enabled ?? false} />
          启用 Telegram 通知
        </label>
        <button className="workspace-action-button primary" type="submit">
          保存 Telegram 设置
        </button>
      </form>
    </section>
  );
}
