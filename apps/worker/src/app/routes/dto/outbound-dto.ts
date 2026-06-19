import type { OutboundListResult } from "@wemail/shared";

type OutboundRecordLike = {
  id: string;
  mailboxId?: string;
  fromAddress?: string;
  toAddress: string;
  subject: string;
  bodyText?: string;
  status: string;
  errorText: string | null;
  providerMessageId?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  createdAt: string;
};

export function toOutboundListResponse(messages: OutboundRecordLike[] | OutboundListResult) {
  if (Array.isArray(messages)) return { messages };
  return messages;
}

export function toQuotaResponse(quota: {
  dailyLimit: number;
  sendsToday: number;
  disabled: boolean;
}) {
  return {
    ok: true,
    quota: {
      dailyLimit: quota.dailyLimit,
      sendsToday: quota.sendsToday,
      disabled: quota.disabled
    }
  };
}
