import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MailDomainSummary, UserRole } from "@wemail/shared";

import { Button } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";
import { fetchSystemDomains, updateSystemDomains } from "./api";

const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

function isValidDomain(value: string) {
  return DOMAIN_PATTERN.test(value);
}

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "管理员" },
  { value: "member", label: "成员" }
];

function formatAllowedRoles(allowedRoles: UserRole[]) {
  if (allowedRoles.length === 0) return "所有角色可用";
  return allowedRoles.map((role) => roleOptions.find((option) => option.value === role)?.label ?? role).join("、") + "可用";
}

export function SystemDomainSettingsPanel() {
  const [domains, setDomains] = useState<MailDomainSummary[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [allowedRoleInput, setAllowedRoleInput] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  const primaryDomain = useMemo(() => domains[0]?.domain ?? "", [domains]);

  useEffect(() => {
    let cancelled = false;

    void fetchSystemDomains()
      .then((settings) => {
        if (cancelled) return;
        setDomains(settings.domains);
        setErrorText(null);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorText("域名设置加载失败，请稍后重试。");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function addDomain() {
    const nextDomain = normalizeDomain(domainInput);
    setStatusText(null);

    if (!isValidDomain(nextDomain)) {
      setErrorText("请输入有效的域名后缀，例如 example.com。");
      return;
    }

    if (domains.some((domain) => domain.domain === nextDomain)) {
      setErrorText("该域名后缀已在列表中。");
      return;
    }

    setDomains((current) => [...current, { domain: nextDomain, allowedRoles: allowedRoleInput }]);
    setDomainInput("");
    setAllowedRoleInput([]);
    setErrorText(null);
  }

  function removeDomain(domain: string) {
    setStatusText(null);
    setErrorText(null);
    setDomains((current) => current.filter((item) => item.domain !== domain));
  }

  function toggleAllowedRole(role: UserRole) {
    setStatusText(null);
    setErrorText(null);
    setAllowedRoleInput((current) =>
      current.includes(role) ? current.filter((currentRole) => currentRole !== role) : [...current, role]
    );
  }

  async function saveDomains() {
    if (domains.length === 0) {
      setErrorText("至少保留一个邮箱域名后缀。");
      return;
    }

    setIsSaving(true);
    setStatusText(null);
    setErrorText(null);
    try {
      const settings = await updateSystemDomains(domains);
      setDomains(settings.domains);
      setStatusText("域名设置已保存。");
    } catch {
      setErrorText("域名设置保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel workspace-card page-panel system-domain-settings-panel">
      <div className="system-domain-settings-head">
        <div className="system-domain-settings-copy">
          <p className="panel-kicker">邮箱域名</p>
          <h2>域名设置</h2>
          <p className="section-copy">管理新邮箱地址可使用的域名后缀。列表中的第一个域名会作为新建邮箱的默认后缀。</p>
        </div>
        {primaryDomain ? (
          <div className="system-domain-primary" aria-label="当前默认域名">
            <span>默认后缀</span>
            <strong>@{primaryDomain}</strong>
          </div>
        ) : null}
      </div>

      <div className="system-domain-list" aria-label="邮箱域名后缀列表">
        {isLoading ? <p className="empty-state">正在加载域名设置...</p> : null}
        {!isLoading && domains.length === 0 ? <p className="empty-state">尚未配置邮箱域名后缀。</p> : null}
        {domains.map((domain, index) => (
          <div className="system-domain-row" key={domain.domain}>
            <div>
              <strong>@{domain.domain}</strong>
              <span>{index === 0 ? `默认用于新建邮箱 · ${formatAllowedRoles(domain.allowedRoles)}` : formatAllowedRoles(domain.allowedRoles)}</span>
            </div>
            <Button
              aria-label={`移除 ${domain.domain}`}
              disabled={isSaving}
              leadingIcon={<Trash2 aria-hidden="true" />}
              onClick={() => removeDomain(domain.domain)}
              size="sm"
              variant="ghost"
            >
              移除
            </Button>
          </div>
        ))}
      </div>

      <div className="system-domain-editor">
        <FormField htmlFor="system-domain-input" label="新增域名后缀">
          <TextInput
            id="system-domain-input"
            onChange={(event) => {
              setDomainInput(event.target.value);
              setErrorText(null);
              setStatusText(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addDomain();
            }}
            placeholder="example.com"
            value={domainInput}
          />
        </FormField>
        <fieldset className="system-domain-role-picker">
          <legend>可用角色</legend>
          <div>
            {roleOptions.map((role) => (
              <label key={role.value}>
                <input
                  checked={allowedRoleInput.includes(role.value)}
                  onChange={() => toggleAllowedRole(role.value)}
                  type="checkbox"
                />
                <span>{role.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button leadingIcon={<Plus aria-hidden="true" />} onClick={addDomain} type="button" variant="secondary">
          添加域名
        </Button>
      </div>

      {errorText ? (
        <p className="form-message system-domain-message" data-tone="error" role="alert">
          {errorText}
        </p>
      ) : null}
      {statusText ? (
        <p className="form-message system-domain-message" data-tone="success" role="status">
          {statusText}
        </p>
      ) : null}

      <div className="system-domain-actions">
        <Button disabled={isSaving || isLoading} onClick={() => void saveDomains()} variant="primary">
          {isSaving ? "保存中..." : "保存域名设置"}
        </Button>
      </div>
    </section>
  );
}
