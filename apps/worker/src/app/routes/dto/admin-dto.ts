type InviteLike = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  targetRole: "admin" | "member";
  redeemedByUserId: string | null;
  redeemedByUserName?: string | null;
  redeemedAt: string | null;
  disabledAt: string | null;
};

export function toInviteListItem(invite: InviteLike) {
  return {
    ...invite,
    status: invite.redeemedAt
      ? "redeemed"
      : invite.disabledAt
        ? "disabled"
        : invite.expiresAt && new Date(invite.expiresAt) <= new Date()
          ? "expired"
          : "ready"
  };
}
