import { parseMailSettingsRecord } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { readProviderBody } from "../../shared/provider-response";
import { getMailDomains } from "../services/config-service";

type DomainRecord = { name: string; type: string; value: string; record?: string; priority?: number };
type DomainCheck = { name: string; type: string; source: "resend" | "dns"; status: "ok" | "warning" | "error"; message: string };

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("检查服务返回了无效数据");
  return value as Record<string, unknown>;
}

async function fetchJson(url: string, deadline: number, apiKey?: string): Promise<unknown> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("域名检查已超时，请稍后重试");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(remaining, 10_000));
  try {
    const response = await fetch(url, { signal: controller.signal, headers: apiKey ? { authorization: `Bearer ${apiKey}` } : { accept: "application/dns-json" } });
    if (!response.ok) throw new Error(`检查服务返回 HTTP ${response.status}`);
    const raw = await readProviderBody(response, 65_537);
    if (new TextEncoder().encode(raw).byteLength > 65_536) throw new Error("检查服务返回数据过大");
    return JSON.parse(raw);
  } finally { clearTimeout(timeout); }
}

function normalizeHost(value: string) {
  return value.toLowerCase().replace(/\.$/, "");
}

function normalizeTxt(value: string) {
  const chunks = value.match(/"(?:[^"\\]|\\.)*"/g);
  const joined = chunks ? chunks.map((chunk) => JSON.parse(chunk) as string).join("") : value;
  return joined.replace(/\s+/g, " ").trim();
}

function matchesAnswer(record: DomainRecord, answer: Record<string, unknown>) {
  if (typeof answer.data !== "string") return false;
  if (record.type === "TXT" && answer.type === 16) {
    const value = normalizeTxt(answer.data);
    return record.record === "DMARC" ? /^v=DMARC1\s*;/i.test(value) : value === normalizeTxt(record.value);
  }
  if (record.type === "CNAME" && answer.type === 5) return normalizeHost(answer.data) === normalizeHost(record.value);
  if (record.type === "MX" && answer.type === 15) {
    const match = answer.data.match(/^(\d+)\s+(\S+)$/);
    return !!match && normalizeHost(match[2]) === normalizeHost(record.value) && (record.priority == null || Number(match[1]) === record.priority);
  }
  return false;
}

export async function checkOutboundDomain(store: AppStore, env: AppBindings) {
  const settings = parseMailSettingsRecord(await store.mailSettings.get());
  const domains = await getMailDomains(store, env);
  const identity = settings.senderRules.defaultIdentity || env.RESEND_FROM || `no-reply@${domains[0]?.domain ?? "example.com"}`;
  const domain = identity.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
  if (!domain || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain)) throw new Error("默认发件身份没有有效域名");
  const checkedAt = new Date().toISOString();
  // This opt-in diagnostic has a fixed network budget, no background polling,
  // and at most four concurrent DNS requests. Settings reads stay local.
  const deadline = Date.now() + 15_000;
  const checks: DomainCheck[] = [];
  let records: DomainRecord[] = [];
  if (env.RESEND_API_KEY) {
    try {
      let cursor: string | undefined;
      let found: { id: string; name: string } | undefined;
      for (let page = 0; page < 10; page += 1) {
        const list = asRecord(await fetchJson(`https://api.resend.com/domains?limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`, deadline, env.RESEND_API_KEY));
        if (!Array.isArray(list.data)) throw new Error("供应商未返回域名列表");
        const entries = list.data.map((value) => {
          const entry = asRecord(value);
          if (typeof entry.id !== "string" || !entry.id || typeof entry.name !== "string") throw new Error("供应商域名列表格式无效");
          return { id: entry.id, name: entry.name };
        });
        found = entries.find((entry) => normalizeHost(entry.name) === domain);
        if (found || !list.has_more || !entries.length) break;
        cursor = entries[entries.length - 1].id;
      }
      if (found) {
        const result = asRecord(await fetchJson(`https://api.resend.com/domains/${encodeURIComponent(found.id)}`, deadline, env.RESEND_API_KEY));
        if (!Array.isArray(result.records)) throw new Error("供应商未返回 DNS 记录");
        records = result.records.map((value) => {
          const record = asRecord(value);
          if (typeof record.name !== "string" || typeof record.type !== "string" || typeof record.value !== "string") throw new Error("供应商 DNS 记录格式无效");
          return { name: record.name, type: record.type, value: record.value, record: typeof record.record === "string" ? record.record : undefined, priority: typeof record.priority === "number" ? record.priority : undefined };
        });
        checks.push({ name: domain, type: "domain", source: "resend", status: result.status === "verified" ? "ok" : "warning", message: `供应商域名状态：${typeof result.status === "string" ? result.status : "unknown"}` });
      } else checks.push({ name: domain, type: "domain", source: "resend", status: "warning", message: "当前查询范围内未找到该发件域名，请在供应商控制台核对" });
    } catch (error) { checks.push({ name: domain, type: "domain", source: "resend", status: "error", message: error instanceof Error ? error.message : "供应商检查失败" }); }
  } else checks.push({ name: domain, type: "domain", source: "resend", status: "warning", message: "未配置发送凭据，无法读取供应商验证结果" });

  const expected = records.filter((record) => ["TXT", "CNAME", "MX"].includes(record.type)).slice(0, 12);
  const inputs = [
    ...expected.map((record) => {
      const name = normalizeHost(record.name);
      return { ...record, name: name === "@" ? domain : name === domain || name.endsWith(`.${domain}`) ? name : `${name}.${domain}` };
    }),
    { name: `_dmarc.${domain}`, type: "TXT", value: "v=DMARC1", record: "DMARC" }
  ];
  for (let offset = 0; offset < inputs.length; offset += 4) {
    checks.push(...await Promise.all(inputs.slice(offset, offset + 4).map(async (record): Promise<DomainCheck> => {
      try {
        const query = new URLSearchParams({ name: record.name, type: record.type });
        const result = asRecord(await fetchJson(`https://cloudflare-dns.com/dns-query?${query}`, deadline));
        const match = result.Status === 0 && Array.isArray(result.Answer) && result.Answer.some((answer: unknown) => matchesAnswer(record, asRecord(answer)));
        return { name: record.name, type: record.type, source: "dns", status: match ? "ok" : "warning", message: match ? `${record.record ?? record.type} 记录与期望匹配` : "未查询到匹配记录，请核对解析传播与供应商要求" };
      } catch (error) { return { name: record.name, type: record.type, source: "dns", status: "error", message: error instanceof Error ? error.message : "DNS 查询失败" }; }
    })));
  }
  return { domain, checkedAt, checks };
}
