import productionWorker from "../../src/index";
import { processInboundEmail } from "../../src/app/runtime";
import { processNotificationOutbox } from "../../src/app/services/notification-outbox-service";
import type { AppBindings } from "../../src/core/bindings";
import { createD1Store } from "../../src/infrastructure/persistence/d1";

type BusinessBindings = AppBindings & { BUSINESS_TEST_TOKEN: string };

// This entry is bundled only by the local test runner. No actual external
// request may escape the harness; production uses its unchanged fetch API.
const providerRequests: Array<{ url: string; body: string }> = [];
let resendFailures = 0;
let webhookFailures = 0;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  providerRequests.push({ url: url.toString(), body: String(init?.body ?? "") });
  if (url.hostname === "api.resend.com") {
    if (resendFailures > 0) {
      resendFailures -= 1;
      return Response.json({ message: "Controlled provider outage" }, { status: 503 });
    }
    return Response.json({ id: crypto.randomUUID() });
  }
  if (url.hostname === "hooks.business.test") {
    if (webhookFailures > 0) {
      webhookFailures -= 1;
      return new Response("Controlled webhook outage", { status: 503 });
    }
    return new Response("ok");
  }
  throw new Error(`External network is disabled in business E2E: ${url.hostname}`);
};

export default {
  async fetch(request: Request, env: BusinessBindings, context: ExecutionContext) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/__test/")) return productionWorker.fetch(request, env, context);
    if (env.ENVIRONMENT !== "local" || !env.BUSINESS_TEST_TOKEN || request.headers.get("authorization") !== `Bearer ${env.BUSINESS_TEST_TOKEN}`) {
      return Response.json({ error: "Test driver authentication required" }, { status: 403 });
    }
    const store = createD1Store(env.DB!);
    if (path === "/__test/seed" && request.method === "POST") {
      await store.mailDomains.saveAll([{ domain: "example.com", allowedRoles: ["admin", "member"] }]);
      for (let index = 0; index < 10; index += 1) {
        await store.invites.create({ code: `BUSINESS-${index}`, createdByUserId: null });
      }
      // First registration intentionally bootstraps the admin; browser flows
      // subsequently register members so ownership checks cannot be bypassed.
      const response = await productionWorker.fetch(new Request(`${new URL(request.url).origin}/api/auth/register`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "business-admin@example.com", password: "business-password-123", name: "Business Admin", inviteCode: "BUSINESS-0" })
      }), env, context);
      if (!response.ok) return response;
      const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
      const settings = await productionWorker.fetch(new Request(`${new URL(request.url).origin}/api/mail/settings`, {
        method: "PUT", headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ senderRules: { retryEnabled: true, retryAttempts: "1 次" } })
      }), env, context);
      if (!settings.ok) return settings;
      return Response.json({ ok: true });
    }
    if (path === "/__test/inbound" && request.method === "POST") {
      const payload = await request.json() as { to: string; raw: string };
      const raw = new Blob([payload.raw]).stream();
      const message = await processInboundEmail(env, store, { to: payload.to, raw });
      return Response.json({ message });
    }
    if (path === "/__test/providers" && request.method === "POST") {
      const payload = await request.json() as { resendFailures?: number; webhookFailures?: number };
      resendFailures = Math.max(0, Math.min(payload.resendFailures ?? 0, 10));
      webhookFailures = Math.max(0, Math.min(payload.webhookFailures ?? 0, 10));
      providerRequests.length = 0;
      return Response.json({ ok: true });
    }
    if (path === "/__test/providers" && request.method === "GET") return Response.json({ requests: providerRequests });
    if (path === "/__test/dispatch" && request.method === "POST") {
      const payload = await request.json() as { now?: string };
      const now = payload.now ? new Date(payload.now) : new Date();
      if (!Number.isFinite(now.getTime())) return Response.json({ error: "Invalid test clock" }, { status: 400 });
      return Response.json(await processNotificationOutbox(store, env, { now }));
    }
    if (path === "/__test/quota" && request.method === "POST") {
      const payload = await request.json() as { email: string; apiDailyLimit?: number; dailyLimit?: number };
      const user = await store.users.findByEmail(payload.email);
      if (!user) return Response.json({ error: "User not found" }, { status: 404 });
      const quota = await store.quotas.getByUserId(user.id, 20, 200);
      await store.quotas.save({ ...quota, apiCallsToday: 0, sendsToday: 0, apiDailyLimit: payload.apiDailyLimit ?? quota.apiDailyLimit, dailyLimit: payload.dailyLimit ?? quota.dailyLimit });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Test driver route not found" }, { status: 404 });
  }
};
