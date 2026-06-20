import type { FeatureToggles, MailDomainSummary, UserRole } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";
import { getRuntimeSettings } from "./runtime-settings-service";

const MAIL_DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;

export function normalizeMailDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/^@+/, "");
  if (!MAIL_DOMAIN_PATTERN.test(domain)) return null;
  return domain;
}

export function normalizeMailDomains(values: Array<string | null | undefined>) {
  const domains: string[] = [];

  for (const value of values) {
    if (!value) continue;
    const domain = normalizeMailDomain(value);
    if (domain && !domains.includes(domain)) domains.push(domain);
  }

  return domains;
}

function normalizeAllowedRoles(values: unknown): UserRole[] {
  if (!Array.isArray(values)) return [];

  const roles: UserRole[] = [];
  for (const value of values) {
    if ((value === "admin" || value === "member") && !roles.includes(value)) {
      roles.push(value);
    }
  }
  return roles;
}

export function normalizeMailDomainEntries(values: unknown[]): MailDomainSummary[] {
  const domains: MailDomainSummary[] = [];

  for (const value of values) {
    const rawDomain = typeof value === "string" ? value : typeof value === "object" && value ? (value as { domain?: unknown }).domain : null;
    if (typeof rawDomain !== "string") continue;

    const domain = normalizeMailDomain(rawDomain);
    if (!domain || domains.some((entry) => entry.domain === domain)) continue;

    domains.push({
      domain,
      allowedRoles: typeof value === "object" && value ? normalizeAllowedRoles((value as { allowedRoles?: unknown }).allowedRoles) : []
    });
  }

  return domains;
}

export function defaultMailDomains(env: Pick<AppBindings, "DEFAULT_MAIL_DOMAIN">) {
  const domains = normalizeMailDomains([env.DEFAULT_MAIL_DOMAIN]);
  return (domains.length > 0 ? domains : ["example.com"]).map((domain) => ({ domain, allowedRoles: [] }));
}

export async function getMailDomains(store: AppStore, env: Pick<AppBindings, "DEFAULT_MAIL_DOMAIN">) {
  const domains = await store.mailDomains.list(defaultMailDomains(env));
  return domains.length > 0 ? domains : defaultMailDomains(env);
}

export function getMailDomainsForRole(domains: MailDomainSummary[], role: UserRole) {
  return domains.filter((domain) => domain.allowedRoles.length === 0 || domain.allowedRoles.includes(role));
}

export function defaultFeatureToggles(env: AppBindings): FeatureToggles {
  return resolveAppConfig(env).features;
}

export function getMailboxLimit(env: Pick<AppBindings, "MAILBOX_LIMIT">) {
  return resolveAppConfig(env as AppBindings).mailbox.limit;
}

export function getOutboundLimit(env: Pick<AppBindings, "OUTBOUND_DAILY_LIMIT">) {
  return resolveAppConfig(env as AppBindings).outbound.dailyLimit;
}

export function getApiDailyLimit(env: Pick<AppBindings, "API_DAILY_LIMIT">) {
  return resolveAppConfig(env as AppBindings).api.dailyLimit;
}

export async function getResolvedMailboxLimit(store: AppStore, env: AppBindings) {
  return (await getRuntimeSettings(store, env)).mailbox.limit;
}

export async function getResolvedOutboundLimit(store: AppStore, env: AppBindings) {
  return (await getRuntimeSettings(store, env)).outbound.dailyLimit;
}

export async function getResolvedApiDailyLimit(store: AppStore, env: AppBindings) {
  return (await getRuntimeSettings(store, env)).api.dailyLimit;
}
