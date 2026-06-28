import type {
  ApiKeySummary,
  DataReliabilitySummary,
  DictionaryCatalogGroup,
  ProductMaturitySummary,
  RuntimeSettings,
  SystemDiagnosticsSummary,
  SystemOperationsSummary,
  TelegramDeliverySummary,
  TelegramOverviewSummary
} from "@wemail/shared";

import {
  fetchApiKeys,
  fetchDictionaries,
  fetchRuntimeSettings,
  fetchSystemDiagnostics,
  fetchSystemMaturity,
  fetchSystemOperations,
  fetchSystemReliability,
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

export type SettingsDataQueryOptions = {
  includeApiKeys?: boolean;
  includeDictionaries?: boolean;
  includeRuntimeSettings?: boolean;
  includeSystemDiagnostics?: boolean;
  includeSystemMaturity?: boolean;
  includeSystemOperations?: boolean;
  includeSystemReliability?: boolean;
  includeTelegram?: boolean;
};

export async function querySettingsData(options?: SettingsDataQueryOptions) {
  const shouldFetchApiKeys = options?.includeApiKeys ?? true;
  const shouldFetchDictionaries = options?.includeDictionaries ?? true;
  const shouldFetchRuntimeSettings = options?.includeRuntimeSettings ?? false;
  const shouldFetchSystemDiagnostics = options?.includeSystemDiagnostics ?? false;
  const shouldFetchSystemMaturity = options?.includeSystemMaturity ?? false;
  const shouldFetchSystemOperations = options?.includeSystemOperations ?? false;
  const shouldFetchSystemReliability = options?.includeSystemReliability ?? false;
  const shouldFetchTelegram = options?.includeTelegram ?? true;

  const [
    keyPayload,
    telegramPayload,
    deliveryPayload,
    dictionaryPayload,
    runtimeSettingsPayload,
    systemDiagnosticsPayload,
    systemMaturityPayload,
    systemOperationsPayload,
    systemReliabilityPayload
  ] = await Promise.all([
    shouldFetchApiKeys ? fetchApiKeys() : Promise.resolve(null),
    shouldFetchTelegram ? fetchTelegramOverview() : Promise.resolve(null),
    shouldFetchTelegram ? fetchTelegramDeliveries() : Promise.resolve(null),
    shouldFetchDictionaries ? fetchDictionaries() : Promise.resolve(null),
    shouldFetchRuntimeSettings ? fetchRuntimeSettings() : Promise.resolve(null),
    shouldFetchSystemDiagnostics ? fetchSystemDiagnostics() : Promise.resolve(null),
    shouldFetchSystemMaturity ? fetchSystemMaturity() : Promise.resolve(null),
    shouldFetchSystemOperations ? fetchSystemOperations() : Promise.resolve(null),
    shouldFetchSystemReliability ? fetchSystemReliability() : Promise.resolve(null)
  ]);

  return {
    apiKeys: keyPayload ? (keyPayload.keys as ApiKeySummary[]) : undefined,
    dictionaries: dictionaryPayload ? ((dictionaryPayload.dictionaries ?? []) as DictionaryCatalogGroup[]) : undefined,
    runtimeSettings: runtimeSettingsPayload ? ((runtimeSettingsPayload.settings ?? null) as RuntimeSettings | null) : undefined,
    systemDiagnostics: systemDiagnosticsPayload
      ? ((systemDiagnosticsPayload.diagnostics ?? null) as SystemDiagnosticsSummary | null)
      : undefined,
    systemMaturity: systemMaturityPayload
      ? ((systemMaturityPayload.maturity ?? null) as ProductMaturitySummary | null)
      : undefined,
    systemOperations: systemOperationsPayload
      ? ((systemOperationsPayload.operations ?? null) as SystemOperationsSummary | null)
      : undefined,
    systemReliability: systemReliabilityPayload
      ? ((systemReliabilityPayload.reliability ?? null) as DataReliabilitySummary | null)
      : undefined,
    telegramOverview: telegramPayload ? ((telegramPayload.overview ?? emptyTelegramOverview) as TelegramOverviewSummary) : undefined,
    telegramDeliveries: deliveryPayload ? ((deliveryPayload.deliveries ?? []) as TelegramDeliverySummary[]) : undefined
  };
}
