import type {
  ApiKeySummary,
  DictionaryCatalogGroup,
  RuntimeSettings,
  TelegramDeliverySummary,
  TelegramOverviewSummary
} from "@wemail/shared";

import {
  fetchApiKeys,
  fetchDictionaries,
  fetchRuntimeSettings,
  fetchTelegramDeliveries,
  fetchTelegramOverview
} from "./api";

const emptyTelegramOverview: TelegramOverviewSummary = {
  botConfigured: false,
  canSendTest: false,
  featureEnabled: false,
  subscription: null,
  supportedEvents: []
};

export async function querySettingsData(options?: { includeRuntimeSettings?: boolean }) {
  const [keyPayload, telegramPayload, deliveryPayload, dictionaryPayload, runtimeSettingsPayload] = await Promise.all([
    fetchApiKeys(),
    fetchTelegramOverview(),
    fetchTelegramDeliveries(),
    fetchDictionaries(),
    options?.includeRuntimeSettings ? fetchRuntimeSettings() : Promise.resolve({ settings: null })
  ]);

  return {
    apiKeys: keyPayload.keys as ApiKeySummary[],
    dictionaries: (dictionaryPayload.dictionaries ?? []) as DictionaryCatalogGroup[],
    runtimeSettings: (runtimeSettingsPayload.settings ?? null) as RuntimeSettings | null,
    telegramOverview: (telegramPayload.overview ?? emptyTelegramOverview) as TelegramOverviewSummary,
    telegramDeliveries: (deliveryPayload.deliveries ?? []) as TelegramDeliverySummary[]
  };
}
