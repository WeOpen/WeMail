import { describe, expect, it, vi, afterEach } from "vitest";

import { evaluateNotificationRules, parseNotificationRulePayload, toNotificationRuleRecordInput } from "../src/app/services/notification-rule-service";
import { createInMemoryStore } from "../src/infrastructure/persistence/in-memory";
import { registerUserAndGetCookie } from "./helpers/test-env";

async function createRule(timezone?: string) {
  const store = createInMemoryStore();
  await store.notificationRules.create(toNotificationRuleRecordInput("user-1", parseNotificationRulePayload({
    name: "Night quiet hours", enabled: true, target: "webhook", eventTypes: ["message.received"],
    quietHoursStart: "23:00", quietHoursEnd: "07:00", ...(timezone ? { quietHoursTimezone: timezone } : {})
  })));
  return store;
}

describe("notification rule evaluation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps legacy rules in UTC while interpreting explicit Shanghai cross-midnight hours", async () => {
    const now = new Date("2026-10-06T15:30:00.000Z");
    const sample = { target: "webhook" as const, eventType: "message.received", data: {}, now };
    const legacy = await evaluateNotificationRules(await createRule(), "user-1", sample);
    const local = await evaluateNotificationRules(await createRule("Asia/Shanghai"), "user-1", sample);
    expect(legacy.shouldSend).toBe(true);
    expect(legacy.rules[0].quietHoursTimezone).toBe("UTC");
    expect(local.shouldSend).toBe(false);
    expect(local.rules[0].reasons).toContain("quiet_hours");
  });

  it("uses timezone daylight-saving rules instead of a fixed UTC offset", async () => {
    const store = await createRule("America/New_York");
    for (const instant of ["2026-07-01T03:30:00.000Z", "2026-01-01T04:30:00.000Z"]) {
      const result = await evaluateNotificationRules(store, "user-1", { target: "webhook", eventType: "message.received", data: {}, now: new Date(instant) });
      expect(result.rules[0].reasons).toContain("quiet_hours");
    }
    expect(() => parseNotificationRulePayload({ name: "Bad timezone", target: "webhook", eventTypes: ["message.received"], quietHoursTimezone: "Invalid/Location" })).toThrow(/timezone/i);
  });

  it("explains mismatched target, event, mailbox and keyword without dispatching", async () => {
    const store = createInMemoryStore();
    await store.notificationRules.create(toNotificationRuleRecordInput("user-1", parseNotificationRulePayload({
      name: "Codes only", target: "webhook", targetId: "endpoint-1", eventTypes: ["message.extracted"], mailboxIds: ["mailbox-1"], keyword: "verification"
    })));
    const result = await evaluateNotificationRules(store, "user-1", { target: "webhook", targetId: "endpoint-2", eventType: "message.received", data: { mailboxId: "mailbox-2", subject: "News" } });
    expect(result.shouldSend).toBe(false);
    expect(result.rules[0].reasons.sort()).toEqual(["event_mismatch", "keyword_mismatch", "mailbox_mismatch", "target_mismatch"]);
  });

  it("exposes only owned task metadata and protects admin aggregates and foreign replay", async () => {
    const { app, env, store, cookie } = await registerUserAndGetCookie();
    const user = await store.users.findByEmail("admin@example.com");
    await store.users.updateRole(user!.id, "member");
    const endpoint = await store.webhookEndpoints.create({ userId: user!.id, name: "Owned webhook", url: "https://hooks.example.test", enabled: true, eventsJson: '["message.received"]' });
    const common = { target: "webhook" as const, targetId: endpoint.id, eventType: "message.received", payloadJson: '{"data":{"extraction":{"value":"654321"}}}', expiresAt: "2099-01-01T00:00:00.000Z" };
    const owned = await store.notificationOutbox.enqueue({ ...common, eventId: "owned", userId: user!.id });
    const foreign = await store.notificationOutbox.enqueue({ ...common, eventId: "foreign", userId: "other-user" });
    const response = await app.request("/api/notification/deliveries", { headers: { cookie } }, env);
    expect(response.status).toBe(200);
    const payload = await response.json() as { summary: { backlogCount: number }; deliveries: Array<{ id: string; targetName: string }> };
    expect(payload.summary.backlogCount).toBe(1);
    expect(payload.deliveries.map((entry) => entry.id)).toEqual([owned.id]);
    expect(payload.deliveries[0].targetName).toBe("Owned webhook");
    expect(JSON.stringify(payload)).not.toContain("654321");
    expect(JSON.stringify(payload)).not.toContain("leaseToken");
    expect((await app.request("/api/system/notification-status", { headers: { cookie } }, env)).status).toBe(403);
    expect((await app.request(`/api/notification/deliveries/${foreign.id}/retry`, { method: "POST", headers: { cookie } }, env)).status).toBe(409);
    const now = new Date().toISOString();
    const [claimed] = await store.notificationOutbox.claimDue({ nowIso: now, lockBeforeIso: now, limit: 1, taskId: owned.id, userId: user!.id });
    await store.notificationOutbox.markFailed(owned.id, { leaseToken: claimed.leaseToken!, error: "Test outage" });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ ok: true })));
    const replay = await app.request(`/api/notification/deliveries/${owned.id}/retry`, { method: "POST", headers: { cookie } }, env);
    expect(replay.status).toBe(200);
    expect((await store.notificationOutbox.listByUser(user!.id))[0].status).toBe("succeeded");
  });
});
