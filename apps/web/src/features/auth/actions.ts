import { loginWithPassword, logoutSession, registerWithInvite } from "./api";

export async function registerWithInviteAction(payload: {
  email: FormDataEntryValue | null;
  name: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  inviteCode: FormDataEntryValue | null;
}) {
  return registerWithInvite(payload);
}

export async function loginWithPasswordAction(payload: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
}) {
  return loginWithPassword(payload);
}

export async function logoutSessionAction() {
  return logoutSession();
}
