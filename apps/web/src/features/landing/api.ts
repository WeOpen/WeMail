import { apiFetch } from "../../shared/api/client";

export type PublicSystemHealth = {
  appName: string;
  environment: string;
  ok: boolean;
};

export function fetchPublicSystemHealth() {
  return apiFetch<PublicSystemHealth>("/api/system/health");
}
