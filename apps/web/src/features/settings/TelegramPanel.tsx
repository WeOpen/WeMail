import type { FormEvent } from "react";

import type { TelegramSubscriptionSummary } from "@wemail/shared";

type TelegramPanelProps = {
  telegram: TelegramSubscriptionSummary | null;
  onSaveTelegram: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function TelegramPanel({ telegram, onSaveTelegram }: TelegramPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">Alert routing</p>
      <h2>Telegram relay</h2>
      <p className="section-copy">Bind a chat ID so new mailbox activity can mirror into Telegram without leaving the control surface.</p>
      <form className="composer-form" onSubmit={onSaveTelegram}>
        <label>
          Chat ID
          <input name="chatId" defaultValue={telegram?.chatId ?? ""} />
        </label>
        <label className="checkbox-row">
          <input name="enabled" type="checkbox" defaultChecked={telegram?.enabled ?? false} />
          Keep Telegram notifications live
        </label>
        <button className="workspace-action-button primary" type="submit">
          Save Telegram relay
        </button>
      </form>
    </section>
  );
}
