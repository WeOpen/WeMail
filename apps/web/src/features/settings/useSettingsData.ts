import { FormEvent, useCallback, useState } from "react";

import type { ApiKeySummary, SessionSummary, TelegramSubscriptionSummary } from "@wemail/shared";

import type { WemailToastInput } from "../../shared/toast";
import { createApiKeyAction, revokeApiKeyAction, saveTelegramAction } from "./actions";
import { querySettingsData } from "./queries";

type UseSettingsDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

export function useSettingsData({ session, onToast }: UseSettingsDataOptions) {
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [telegram, setTelegram] = useState<TelegramSubscriptionSummary | null>(null);

  const refreshSettingsData = useCallback(async () => {
    if (!session) return;
    const data = await querySettingsData();
    setApiKeys(data.apiKeys);
    setTelegram(data.telegram);
  }, [session]);

  const createApiKey = useCallback(
    async (label: string) => {
      const payload = await createApiKeyAction(label);
      onToast({
        message: `API Key 已创建，请立即复制：${payload.key.secret}`,
        tone: "info",
        dismissible: true,
        durationMs: 6000
      });
      await refreshSettingsData();
    },
    [onToast, refreshSettingsData]
  );

  const revokeApiKey = useCallback(
    async (keyId: string) => {
      await revokeApiKeyAction(keyId);
      onToast({ message: "API Key 已吊销。", tone: "success" });
      await refreshSettingsData();
    },
    [onToast, refreshSettingsData]
  );

  const saveTelegram = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await saveTelegramAction({
        chatId: form.get("chatId"),
        enabled: form.get("enabled") === "on"
      });
      onToast({ message: "Telegram 设置已保存。", tone: "success" });
      await refreshSettingsData();
    },
    [onToast, refreshSettingsData]
  );

  return {
    apiKeys,
    telegram,
    refreshSettingsData,
    createApiKey,
    revokeApiKey,
    saveTelegram
  };
}