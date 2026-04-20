import type { OutboundHistoryItem } from "../inbox/types";

export type OutboundRecordStatus = "已发送" | "失败" | "异常 / 无匹配";

export type OutboundRecord = {
  id: string;
  source: "history" | "exception";
  toAddress: string;
  subject: string;
  status: OutboundRecordStatus;
  summary: string;
  createdAtLabel: string;
  payloadPreview: string;
  failureReason: string | null;
};

export const outboundExceptionMockData: OutboundRecord[] = [
  {
    id: "exception-1",
    source: "exception",
    toAddress: "unknown+signup@example.com",
    subject: "Magic link fallback",
    status: "异常 / 无匹配",
    summary: "未命中邮箱路由，等待人工处理。",
    createdAtLabel: "5 分钟前",
    payloadPreview: '{"to":"unknown+signup@example.com","subject":"Magic link fallback"}',
    failureReason: "未匹配到邮箱或路由策略"
  }
];

export function buildOutboundRecords(history: OutboundHistoryItem[]) {
  const historyRecords: OutboundRecord[] = history.map((item) => ({
      id: item.id,
      source: "history",
      toAddress: item.toAddress,
      subject: item.subject,
      status: item.status === "failed" ? "失败" : "已发送",
      summary: item.errorText ?? "已发送到收件人。",
      createdAtLabel: new Date(item.createdAt).toLocaleString("zh-CN"),
      payloadPreview: JSON.stringify({ toAddress: item.toAddress, subject: item.subject }, null, 2),
      failureReason: item.errorText
    }));

  return [...historyRecords, ...outboundExceptionMockData];
}
