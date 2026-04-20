import type { MessageSummary } from "@wemail/shared";

import { formatAttachmentSize, formatReceivedAt } from "./formatters";

function toExtractionChip(message: MessageSummary) {
  if (message.extraction.type === "auth_code" && message.extraction.value.trim()) {
    return { tone: "code", primary: message.extraction.value, secondary: "已提取验证码" } as const;
  }

  if (["auth_link", "service_link", "subscription_link", "other_link"].includes(message.extraction.type)) {
    return { tone: "link", primary: "LOGIN LINK", secondary: message.extraction.label || "已识别链接" } as const;
  }

  return {
    tone: "muted",
    primary: "未提取",
    secondary: message.previewText || "未识别到验证码或链接"
  } as const;
}

export function toMessageListItemViewModel(message: MessageSummary) {
  return {
    id: message.id,
    subject: message.subject,
    fromAddress: message.fromAddress,
    receivedAtLabel: formatReceivedAt(message.receivedAt),
    attachmentCount: message.attachmentCount,
    extractionChip: toExtractionChip(message)
  };
}

export function toMessageDetailViewModel(message: MessageSummary | null) {
  if (!message) return null;
  return {
    ...message,
    receivedAtLabel: formatReceivedAt(message.receivedAt),
    extractionChip: toExtractionChip(message),
    attachments: message.attachments.map((attachment) => ({
      ...attachment,
      sizeLabel: formatAttachmentSize(attachment.size)
    }))
  };
}
