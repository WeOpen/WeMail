import { requireBoolean, requireString, toRecordLike } from "../validators";

export function parseTelegramPayload(input: unknown) {
  const payload = toRecordLike(input);
  const chatId = requireString(payload.chatId, "chatId").trim();
  if (!chatId) throw new Error("chatId is required");
  return {
    chatId,
    enabled: requireBoolean(payload.enabled)
  };
}
