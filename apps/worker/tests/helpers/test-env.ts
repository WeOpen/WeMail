import { createApp } from "../../src/app/create-app";
import { createInMemoryStore } from "../../src/infrastructure/persistence/in-memory";

export const workerTestEnv = {
  APP_NAME: "WeMail",
  COOKIE_NAME: "wemail_session",
  DEFAULT_MAIL_DOMAIN: "example.com",
  MAILBOX_LIMIT: "5",
  MESSAGE_RETENTION_DAYS: "7",
  OUTBOUND_DAILY_LIMIT: "20",
  API_DAILY_LIMIT: "20000",
  AI_FALLBACK_LIMIT: "20",
  MAX_ATTACHMENT_BYTES: "10485760",
  MAX_TOTAL_ATTACHMENT_BYTES: "15728640",
  ENABLE_AI: "true",
  ENABLE_TELEGRAM: "true",
  ENABLE_OUTBOUND: "true",
  ENABLE_MAILBOX_CREATION: "true",
  ADMIN_EMAILS: "admin@example.com",
  COOKIE_SECURE: "false"
} as const;

export function createWorkerTestHarness() {
  const store = createInMemoryStore();
  const app = createApp({ store });
  return { store, app, env: workerTestEnv };
}

export async function registerUserAndGetCookie(options?: {
  email?: string;
  password?: string;
  inviteCode?: string;
}) {
  const { store, app, env } = createWorkerTestHarness();
  const email = options?.email ?? "admin@example.com";
  const password = options?.password ?? "password123";
  const inviteCode = options?.inviteCode ?? "INVITE-HELPER";

  await store.invites.create({
    code: inviteCode,
    createdByUserId: "system"
  });

  const response = await app.request(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        inviteCode
      })
    },
    env
  );

  return {
    store,
    app,
    env,
    response,
    cookie: response.headers.get("set-cookie") ?? ""
  };
}
