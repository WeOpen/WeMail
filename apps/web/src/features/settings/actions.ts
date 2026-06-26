import type { RuntimeSettingsUpdateInput } from "@wemail/shared";

import {
  configureTelegramBotMenu,
  configureTelegramWebhook,
  createApiKey,
  createTelegramLinkCode,
  revokeApiKey,
  saveTelegramSubscription,
  sendTelegramTestMessage,
  updateRuntimeSettings
} from "./api";

export async function createApiKeyAction(label: string) {
  return createApiKey(label);
}

export async function revokeApiKeyAction(keyId: string) {
  return revokeApiKey(keyId);
}

export async function saveTelegramAction(payload: { chatId: string; enabled: boolean }) {
  return saveTelegramSubscription(payload);
}

export async function createTelegramLinkCodeAction() {
  return createTelegramLinkCode();
}

export async function configureTelegramBotMenuAction() {
  return configureTelegramBotMenu();
}

export async function configureTelegramWebhookAction() {
  return configureTelegramWebhook();
}

export async function sendTelegramTestAction() {
  return sendTelegramTestMessage();
}

export async function saveRuntimeSettingsAction(payload: RuntimeSettingsUpdateInput) {
  return updateRuntimeSettings(payload);
}
