import type { MessageSummary } from "@wemail/shared";

import { formatAttachmentSize, formatReceivedAt, formatSenderName } from "./formatters";

const linkChipLabels: Partial<Record<MessageSummary["extraction"]["type"], string>> = {
  auth_link: "登录链接",
  service_link: "服务链接",
  subscription_link: "订阅链接",
  other_link: "有用链接"
};

function toExtractionChip(message: MessageSummary) {
  if (message.extraction.type === "auth_code" && message.extraction.value.trim()) {
    return { tone: "code", icon: "key", primary: message.extraction.value, secondary: "已提取验证码" } as const;
  }

  if (linkChipLabels[message.extraction.type]) {
    // The chip names what the link is for; a fixed English label both broke
    // the Chinese voice and mislabeled service/subscription links as login.
    return { tone: "link", icon: "link", primary: linkChipLabels[message.extraction.type], secondary: message.extraction.label || "已识别链接" } as const;
  }

  return {
    tone: "muted",
    icon: "minus",
    primary: "未提取",
    secondary: message.previewText || "未识别到验证码或链接"
  } as const;
}

export function toMessageListItemViewModel(message: MessageSummary) {
  return {
    id: message.id,
    subject: message.subject,
    fromAddress: message.fromAddress,
    senderName: formatSenderName(message.fromAddress),
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
