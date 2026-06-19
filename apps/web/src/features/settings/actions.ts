import { createApiKey, createTelegramLinkCode, revokeApiKey, saveTelegramSubscription, sendTelegramTestMessage } from "./api";

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

export async function sendTelegramTestAction() {
  return sendTelegramTestMessage();
}
