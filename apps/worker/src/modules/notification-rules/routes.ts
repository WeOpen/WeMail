import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import {
  parseNotificationRulePayload,
  toNotificationRuleRecordInput,
  toNotificationRuleSummary
} from "../../app/services/notification-rule-service";

export function registerNotificationRuleRoutes(app: Hono<AppContext>) {
  app.get("/api/notification/rules", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const rules = await c.get("store").notificationRules.listByUser(user.id);
    return c.json({ rules: rules.map(toNotificationRuleSummary) });
  });

  app.post("/api/notification/rules", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    try {
      const input = parseNotificationRulePayload(await c.req.json());
      const rule = await c.get("store").notificationRules.create(toNotificationRuleRecordInput(user.id, input));
      await recordAudit(c.get("store"), "user", user.id, "notification-rule-create", { ruleId: rule.id, target: rule.target });
      return c.json({ rule: toNotificationRuleSummary(rule) }, 201);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid notification rule payload", 400);
    }
  });

  app.put("/api/notification/rules/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    try {
      const input = parseNotificationRulePayload(await c.req.json());
      const rule = await c.get("store").notificationRules.update(
        c.req.param("id"),
        user.id,
        toNotificationRuleRecordInput(user.id, input)
      );
      if (!rule) return jsonError("Notification rule not found", 404);
      await recordAudit(c.get("store"), "user", user.id, "notification-rule-update", { ruleId: rule.id, target: rule.target });
      return c.json({ rule: toNotificationRuleSummary(rule) });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid notification rule payload", 400);
    }
  });

  app.delete("/api/notification/rules/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const ruleId = c.req.param("id");
    await c.get("store").notificationRules.delete(ruleId, user.id);
    await recordAudit(c.get("store"), "user", user.id, "notification-rule-delete", { ruleId });
    return c.json({ ok: true });
  });
}
