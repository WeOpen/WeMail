import { useEffect, useRef, useState } from "react";

import { Button } from "../../shared/button";
import { checkOutboundDomain, type OutboundDomainResult } from "./api";

export function OutboundDomainCheckPanel() {
  const [result, setResult] = useState<OutboundDomainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function handleCheck() {
    setIsChecking(true);
    setError(null);
    try {
      const next = await checkOutboundDomain();
      if (mounted.current) setResult(next);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : "域名检查失败");
    } finally {
      if (mounted.current) setIsChecking(false);
    }
  }

  return (
    <section className="panel workspace-card page-panel" aria-label="实际发件域名检查">
      <h2>实际域名检查</h2>
      <p>独立查询供应商与公共 DNS，配置摘要仅表示配置已填写。</p>
      <Button onClick={() => void handleCheck()} disabled={isChecking} variant="secondary" size="sm">
        {isChecking ? "正在检查…" : "检查供应商与 DNS"}
      </Button>
      {error ? <p role="alert" className="error-banner">{error}</p> : null}
      {result ? (
        <div aria-live="polite">
          <p>{result.domain} · 检查时间 {new Date(result.checkedAt).toLocaleString("zh-CN")}</p>
          <ul className="mail-settings-asset-list">
            {result.checks.map((check, index) => (
              <li className="mail-settings-asset-row" data-status={check.status} key={`${check.name}:${index}`}>
                <div><strong>{check.source === "resend" ? "供应商" : "公共 DNS"} · {check.name} ({check.type})</strong></div>
                <span>{check.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
