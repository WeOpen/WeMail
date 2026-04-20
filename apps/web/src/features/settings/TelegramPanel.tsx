import type { FormEvent } from "react";

import type { TelegramSubscriptionSummary } from "@wemail/shared";
import { CheckboxField, FormField, TextInput } from "../../shared/form";

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
        <FormField label="Chat ID">
          <TextInput defaultValue={telegram?.chatId ?? ""} name="chatId" />
        </FormField>
        <CheckboxField defaultChecked={telegram?.enabled ?? false} label="启用 Telegram 通知" name="enabled" />
        <button className="workspace-action-button primary" type="submit">
          保存 Telegram 设置
        </button>
      </form>
    </section>
  );
}
