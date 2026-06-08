import type { SessionSummary } from "@wemail/shared";

type SessionUserDto = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  status: SessionSummary["user"]["status"];
  createdAt: string;
  updatedAt: string;
};

export function toSessionResponse(
  user: SessionUserDto,
  featureToggles: SessionSummary["featureToggles"]
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
    featureToggles
  };
}
