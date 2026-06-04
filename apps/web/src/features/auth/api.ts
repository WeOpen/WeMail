import type { SessionSummary } from "@wemail/shared";

import { apiFetch } from "../../shared/api/client";

export function fetchSession() {
  return apiFetch<SessionSummary>("/api/auth/session");
}

export function registerWithInvite(payload: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  inviteCode: FormDataEntryValue | null;
}) {
  return apiFetch<SessionSummary>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginWithPassword(payload: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
}) {
  return apiFetch<SessionSummary>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logoutSession() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}
