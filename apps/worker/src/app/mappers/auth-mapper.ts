import type { SessionSummary } from "@wemail/shared";

import type { AppContext } from "../context";

export function toSessionSummary(
  user: SessionSummary["user"],
  c: Pick<AppContext["Variables"], "featureToggles">
): SessionSummary {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    featureToggles: c.featureToggles
  };
}
