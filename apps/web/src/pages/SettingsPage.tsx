import type { FormEvent } from "react";

import type { ApiKeySummary, TelegramSubscriptionSummary } from "@wemail/shared";

import { ApiKeysPanel } from "../features/settings/ApiKeysPanel";
import { TelegramPanel } from "../features/settings/TelegramPanel";

type SettingsPageProps = {
  apiKeys: ApiKeySummary[];
  telegram: TelegramSubscriptionSummary | null;
  onCreateApiKey: (label: string) => Promise<void>;
  onRevokeApiKey: (keyId: string) => Promise<void>;
  onSaveTelegram: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function SettingsPage({
  apiKeys,
  telegram,
  onCreateApiKey,
  onRevokeApiKey,
  onSaveTelegram
}: SettingsPageProps) {
  return (
    <main className="workspace-grid settings-grid">
      <ApiKeysPanel apiKeys={apiKeys} onCreateApiKey={onCreateApiKey} onRevokeApiKey={onRevokeApiKey} />
      <TelegramPanel telegram={telegram} onSaveTelegram={onSaveTelegram} />
    </main>
  );
}
