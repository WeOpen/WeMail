import type { InviteSummary } from "./types";

export function formatInviteStatus(invite: InviteSummary) {
  if (invite.status === "ready") return "可用";
  if (invite.status === "redeemed") return "已兑换";
  if (invite.status === "disabled") return "已停用";
  if (invite.status === "expired") return "已过期";
  if (invite.redeemedAt) return "已兑换";
  if (invite.disabledAt) return "已停用";
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) return "已过期";
  return "可用";
}
