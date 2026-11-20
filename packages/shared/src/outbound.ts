import type { OutboundListStatus, OutboundMessageStatus } from "./types";

export const outboundSubmittedStatuses: OutboundMessageStatus[] = ["sent", "accepted", "delivered"];
export const outboundFailureStatuses: OutboundMessageStatus[] = ["failed", "bounced", "complained", "uncertain"];

export function matchesOutboundStatus(status: OutboundMessageStatus, filter?: OutboundListStatus) {
  if (!filter || filter === "all") return true;
  if (filter === "sent") return outboundSubmittedStatuses.includes(status);
  if (filter === "failed") return outboundFailureStatuses.includes(status);
  return status === filter;
}

export const outboundStatusLabels: Record<OutboundMessageStatus, string> = {
  sent: "已提交（历史记录）", queued: "等待发送", sending: "正在提交", accepted: "供应商已受理",
  delivered: "已送达", bounced: "已退信", complained: "被投诉", failed: "发送失败", uncertain: "结果待确认"
};
