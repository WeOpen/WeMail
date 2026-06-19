import type { ApiKeySummary, DictionaryCatalogGroup, TelegramDeliverySummary, TelegramOverviewSummary } from "@wemail/shared";

import { fetchApiKeys, fetchDictionaries, fetchTelegramDeliveries, fetchTelegramOverview } from "./api";

const emptyTelegramOverview: TelegramOverviewSummary = {
  botConfigured: false,
  canSendTest: false,
  featureEnabled: false,
  subscription: null,
  supportedEvents: []
};

export async function querySettingsData() {
  const [keyPayload, telegramPayload, deliveryPayload, dictionaryPayload] = await Promise.all([
    fetchApiKeys(),
    fetchTelegramOverview(),
    fetchTelegramDeliveries(),
    fetchDictionaries()
  ]);

  return {
    apiKeys: keyPayload.keys as ApiKeySummary[],
    dictionaries: (dictionaryPayload.dictionaries ?? []) as DictionaryCatalogGroup[],
    telegramOverview: (telegramPayload.overview ?? emptyTelegramOverview) as TelegramOverviewSummary,
    telegramDeliveries: (deliveryPayload.deliveries ?? []) as TelegramDeliverySummary[]
  };
}
