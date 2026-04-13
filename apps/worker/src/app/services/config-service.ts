import type { FeatureToggles } from "@wemail/shared";

import type { AppBindings } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";

export function defaultFeatureToggles(env: AppBindings): FeatureToggles {
  return resolveAppConfig(env).features;
}

export function getMailboxLimit(env: Pick<AppBindings, "MAILBOX_LIMIT">) {
  return resolveAppConfig(env as AppBindings).mailbox.limit;
}

export function getOutboundLimit(env: Pick<AppBindings, "OUTBOUND_DAILY_LIMIT">) {
  return resolveAppConfig(env as AppBindings).outbound.dailyLimit;
}
