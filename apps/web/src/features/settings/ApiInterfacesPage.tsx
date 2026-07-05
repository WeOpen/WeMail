import { useState } from "react";

import { Activity, Braces, ChevronDown, Database, KeyRound, Layers3, LockKeyhole, Route, ShieldCheck } from "lucide-react";

import { Button } from "../../shared/button";
import { apiInterfaceGroups, type ApiEndpoint, type ApiMethod } from "./api-interface-catalog.generated";

type EndpointParameter = {
  example: string;
  name: string;
};

type EndpointExample = {
  headers: string[];
  pathParameters: EndpointParameter[];
  queryParameters: EndpointParameter[];
  requestBody: string | null;
  requestLine: string;
};

const endpointTotal = apiInterfaceGroups.reduce((total, group) => total + group.endpoints.length, 0);
const methodTotals = apiInterfaceGroups
  .flatMap((group) => group.endpoints)
  .reduce<Record<ApiMethod, number>>(
    (totals, endpoint) => ({
      ...totals,
      [endpoint.method]: totals[endpoint.method] + 1
    }),
    { DELETE: 0, GET: 0, PATCH: 0, POST: 0, PUT: 0 }
  );

const methodOrder: ApiMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const bodyMethods = new Set<ApiMethod>(["POST", "PUT", "PATCH"]);

const pathParameterExamples: Record<string, string> = {
  attachmentId: "att_123",
  id: "item_123",
  messageId: "msg_123",
  userId: "user_123"
};

function getEndpointKey(endpoint: ApiEndpoint) {
  return `${endpoint.method} ${endpoint.path}`;
}

function getEndpointDomId(groupId: string, endpoint: ApiEndpoint) {
  return `api-endpoint-${groupId}-${endpoint.method}-${endpoint.path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function getDefaultHeaders(endpoint: ApiEndpoint, hasJsonBody: boolean) {
  if (endpoint.access === "公开") {
    return hasJsonBody ? ["Content-Type: application/json"] : ["无需 Authorization Header"];
  }

  return hasJsonBody ? ["Authorization: Bearer <api-key>", "Content-Type: application/json"] : ["Authorization: Bearer <api-key>"];
}

function buildEndpointExample(endpoint: ApiEndpoint): EndpointExample {
  const endpointExample = endpoint.example;
  const pathParameters = Array.from(endpoint.path.matchAll(/:([A-Za-z0-9_]+)/g), ([, name]) => ({
    name,
    example: endpointExample?.pathParameters?.[name] ?? pathParameterExamples[name] ?? `${name}_123`
  }));
  const queryParameters = Object.entries(endpointExample?.queryParameters ?? {}).map(([name, example]) => ({ name, example }));
  const samplePath = pathParameters.reduce((path, parameter) => path.replace(`:${parameter.name}`, parameter.example), endpoint.path);
  const queryString =
    queryParameters.length > 0
      ? `?${queryParameters.map((parameter) => `${parameter.name}=${encodeURIComponent(parameter.example)}`).join("&")}`
      : "";
  const requestBody =
    endpointExample && Object.prototype.hasOwnProperty.call(endpointExample, "requestBody") ? endpointExample.requestBody ?? null : null;
  const hasJsonBody = bodyMethods.has(endpoint.method) && requestBody !== null;

  return {
    headers: endpointExample?.headers ?? getDefaultHeaders(endpoint, hasJsonBody),
    pathParameters,
    queryParameters,
    requestBody: requestBody === null ? null : JSON.stringify(requestBody, null, 2),
    requestLine: `${endpoint.method} ${samplePath}${queryString}`
  };
}

export function ApiInterfacesPage() {
  const [expandedEndpointKey, setExpandedEndpointKey] = useState<string | null>(null);

  return (
    <main className="workspace-grid api-interfaces-page">
      <section className="panel workspace-card page-panel api-interfaces-hero-card">
        <div className="api-interfaces-hero-copy">
          <p className="panel-kicker">接口目录</p>
          <h1>API 接口</h1>
          <p className="section-copy">
            按后端 Worker 模块分组查看当前服务暴露的全部接口，方便用 API 密钥接入前先确认路径、动作和权限边界。
          </p>
        </div>
        <div className="api-interfaces-hero-metrics" aria-label="API 接口统计">
          <div className="api-interfaces-metric" aria-label="接口总数">
            <strong>{endpointTotal}</strong>
            <span>接口总数</span>
          </div>
          <div className="api-interfaces-metric" aria-label="接口分组数">
            <strong>{apiInterfaceGroups.length}</strong>
            <span>模块分组</span>
          </div>
          <div className="api-interfaces-metric" aria-label="写入接口数">
            <strong>{methodTotals.POST + methodTotals.PUT + methodTotals.PATCH + methodTotals.DELETE}</strong>
            <span>写入动作</span>
          </div>
        </div>
      </section>

      <div className="api-interfaces-layout">
        <section className="api-interfaces-group-list" aria-label="后端 API 接口分组">
          {apiInterfaceGroups.map((group) => (
            <section className="panel workspace-card page-panel api-interfaces-group-card" key={group.id} aria-labelledby={`${group.id}-api-group`}>
              <header className="api-interfaces-group-header">
                <span className="api-interfaces-group-icon" aria-hidden="true">
                  <Route size={20} strokeWidth={1.8} />
                </span>
                <div className="api-interfaces-group-copy">
                  <p className="panel-kicker">{group.kicker}</p>
                  <h2 id={`${group.id}-api-group`}>{group.title}</h2>
                  <p className="section-copy">{group.description}</p>
                </div>
                <span className="api-interfaces-group-count">{group.endpoints.length} 个接口</span>
              </header>

              <div className="api-interfaces-endpoint-list" role="list">
                {group.endpoints.map((endpoint) => {
                  const endpointKey = getEndpointKey(endpoint);
                  const detailsId = getEndpointDomId(group.id, endpoint);
                  const isExpanded = expandedEndpointKey === endpointKey;

                  return (
                    <article className="api-interfaces-endpoint-row" key={endpointKey} role="listitem" aria-label={endpointKey}>
                      <Button
                        className="api-interfaces-endpoint-trigger"
                        aria-controls={detailsId}
                        aria-expanded={isExpanded}
                        aria-label={`展开 ${endpointKey} 参数示例`}
                        contentLayout="plain"
                        onClick={() => setExpandedEndpointKey((currentKey) => (currentKey === endpointKey ? null : endpointKey))}
                        type="button"
                        variant="text"
                      >
                        <span className="api-interfaces-method-chip" data-method={endpoint.method}>
                          {endpoint.method}
                        </span>
                        <div className="api-interfaces-endpoint-main">
                          <strong>{endpoint.title}</strong>
                          <code>{endpoint.path}</code>
                          <p>{endpoint.description}</p>
                        </div>
                        <span className="api-interfaces-endpoint-meta">
                          <span className="api-interfaces-access-chip">{endpoint.access}</span>
                          <ChevronDown className="api-interfaces-endpoint-chevron" size={17} strokeWidth={2} aria-hidden="true" data-expanded={isExpanded} />
                        </span>
                      </Button>
                      {isExpanded ? <EndpointExamplePanel endpoint={endpoint} id={detailsId} /> : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>

        <aside className="api-interfaces-side-rail" aria-label="API 接口侧栏">
          <section className="panel workspace-card page-panel api-interfaces-side-card">
            <div className="api-interfaces-side-heading">
              <span className="api-interfaces-side-icon" aria-hidden="true">
                <Layers3 size={20} strokeWidth={1.8} />
              </span>
              <div>
                <p className="panel-kicker">方法分布</p>
                <h2>HTTP 动作</h2>
              </div>
            </div>
            <div className="api-interfaces-method-list" role="list">
              {methodOrder.map((method) => (
                <div className="api-interfaces-method-row" key={method} role="listitem">
                  <span className="api-interfaces-method-chip" data-method={method}>
                    {method}
                  </span>
                  <strong>{methodTotals[method]}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel workspace-card page-panel api-interfaces-side-card">
            <div className="api-interfaces-side-heading">
              <span className="api-interfaces-side-icon" aria-hidden="true">
                <LockKeyhole size={20} strokeWidth={1.8} />
              </span>
              <div>
                <p className="panel-kicker">接入边界</p>
                <h2>鉴权方式</h2>
              </div>
            </div>
            <div className="api-interfaces-access-list">
              <div>
                <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>工作台页面使用会话 Cookie。</span>
              </div>
              <div>
                <KeyRound size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>外部脚本使用 API 密钥 Bearer Header。</span>
              </div>
              <div>
                <Database size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>管理员接口会继续走角色校验。</span>
              </div>
            </div>
          </section>

          <section className="panel workspace-card page-panel api-interfaces-side-card">
            <div className="api-interfaces-side-heading">
              <span className="api-interfaces-side-icon" aria-hidden="true">
                <Braces size={20} strokeWidth={1.8} />
              </span>
              <div>
                <p className="panel-kicker">来源</p>
                <h2>Worker 路由</h2>
              </div>
            </div>
            <p className="section-copy">
              当前目录由 Worker 侧接口 catalog 生成，并校验 <code>apps/worker/src/modules/*/routes.ts</code> 中注册的 <code>/api/...</code> 路由。
            </p>
            <div className="api-interfaces-sync-pill">
              <Activity size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>生成时校验路由覆盖</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function EndpointExamplePanel({ endpoint, id }: { endpoint: ApiEndpoint; id: string }) {
  const example = buildEndpointExample(endpoint);

  return (
    <section className="api-interfaces-endpoint-details" id={id} role="region" aria-label={`${endpoint.method} ${endpoint.path} 参数示例`}>
      <div className="api-interfaces-details-heading">
        <div>
          <p className="panel-kicker">请求模板</p>
          <h3>参数示例</h3>
        </div>
        <code>{example.requestLine}</code>
      </div>
      <div className="api-interfaces-detail-grid">
        <section className="api-interfaces-example-block">
          <h4>请求 Header</h4>
          <div className="api-interfaces-example-lines">
            {example.headers.map((header) => (
              <code key={header}>{header}</code>
            ))}
          </div>
        </section>

        <section className="api-interfaces-example-block">
          <h4>路径参数</h4>
          {example.pathParameters.length > 0 ? (
            <dl className="api-interfaces-parameter-list">
              {example.pathParameters.map((parameter) => (
                <div key={parameter.name}>
                  <dt>{parameter.name}</dt>
                  <dd>{parameter.example}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>无路径参数</p>
          )}
        </section>

        <section className="api-interfaces-example-block">
          <h4>查询参数</h4>
          {example.queryParameters.length > 0 ? (
            <dl className="api-interfaces-parameter-list">
              {example.queryParameters.map((parameter) => (
                <div key={parameter.name}>
                  <dt>{parameter.name}</dt>
                  <dd>{parameter.example}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>无查询参数</p>
          )}
        </section>

        <section className="api-interfaces-example-block api-interfaces-example-block-wide">
          <h4>请求体示例</h4>
          {example.requestBody ? (
            <pre>
              <code>{example.requestBody}</code>
            </pre>
          ) : (
            <p>无请求体</p>
          )}
        </section>
      </div>
    </section>
  );
}
