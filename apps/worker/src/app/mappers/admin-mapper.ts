export function toInviteStatus(invite: { redemptionCount?: number; maxRedemptions?: number; redeemedAt: string | null; disabledAt: string | null }) {
  if (invite.disabledAt) return "disabled";
  if ((invite.redemptionCount ?? (invite.redeemedAt ? 1 : 0)) >= (invite.maxRedemptions ?? 1)) return "redeemed";
  return "ready";
}
