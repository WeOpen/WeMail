import type { InviteSummary } from "./types";

export function formatInviteStatus(invite: InviteSummary) {
  if (invite.status === "ready") return "Ready";
  if (invite.status === "redeemed") return "Redeemed";
  if (invite.status === "disabled") return "Disabled";
  if (invite.redeemedAt) return "Redeemed";
  if (invite.disabledAt) return "Disabled";
  return "Ready";
}
