import {
  dashboardGrowth,
  dashboardKpis,
  dashboardMailboxDistribution,
  dashboardResources,
  dashboardTrend,
  dashboardUserRoles,
  type DashboardDistributionSlice,
  type DashboardGrowthPoint,
  type DashboardTrendPoint
} from "../features/dashboard/dashboardMockData";

function buildPolyline(points: DashboardTrendPoint[], key: "inbound" | "outbound") {
  const width = 640;
  const height = 260;
  const paddingX = 18;
  const paddingY = 18;
  const values = points.map((point) => point[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return points
    .map((point, index) => {
      const x = paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1);
      const y = height - paddingY - ((point[key] - min) / range) * (height - paddingY * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function buildDonutBackground(slices: DashboardDistributionSlice[]) {
  let offset = 0;
  const segments = slices.map((slice) => {
    const next = offset + slice.value;
    const segment = `${slice.tone} ${offset}% ${next}%`;
    offset = next;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function maxGrowthValue(points: DashboardGrowthPoint[]) {
  return Math.max(...points.flatMap((point) => [point.accounts, point.mailboxes]), 1);
}

export function DashboardPage() {
  const inboundPoints = buildPolyline(dashboardTrend, "inbound");
  const outboundPoints = buildPolyline(dashboardTrend, "outbound");
  const growthMax = maxGrowthValue(dashboardGrowth);

  return (
    <main className="workspace-grid dashboard-grid">
      <section className="dashboard-kpi-grid" aria-label="仪表盘核心指标">
        {dashboardKpis.map((kpi) => (
          <article className="panel workspace-card dashboard-kpi-card" key={kpi.label}>
            <p className="panel-kicker">KPI</p>
            <h2>{kpi.label}</h2>
            <strong>{kpi.value}</strong>
            <span>{kpi.detail}</span>
            <small>{kpi.change}</small>
          </article>
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section className="panel workspace-card dashboard-panel dashboard-trend-panel">
          <div className="dashboard-panel-head">
            <div>
              <p className="panel-kicker">趋势</p>
              <h2>近 7 天收发趋势</h2>
            </div>
            <p className="section-copy dashboard-panel-copy">第一屏先给平台管理员最重要的活跃走势：收件量和发件量如何变化。</p>
          </div>

          <div className="dashboard-trend-legend" aria-hidden="true">
            <span>
              <i className="dashboard-dot dashboard-dot-inbound" />
              收件量
            </span>
            <span>
              <i className="dashboard-dot dashboard-dot-outbound" />
              发件量
            </span>
          </div>

          <div className="dashboard-trend-chart">
            <div className="dashboard-trend-grid" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <svg aria-label="近 7 天收发趋势图" className="dashboard-trend-svg" viewBox="0 0 640 260" role="img">
              <polyline className="dashboard-trend-line inbound" fill="none" points={inboundPoints} />
              <polyline className="dashboard-trend-line outbound" fill="none" points={outboundPoints} />
            </svg>
            <div className="dashboard-trend-axis" aria-hidden="true">
              {dashboardTrend.map((point) => (
                <span key={point.day}>{point.day}</span>
              ))}
            </div>
          </div>
        </section>

        <div className="dashboard-side-stack">
          <section className="panel workspace-card dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <p className="panel-kicker">结构</p>
                <h2>邮箱状态分布</h2>
              </div>
              <p className="section-copy dashboard-panel-copy">右上先看邮箱资源的构成，快速理解活跃与待分配状态。</p>
            </div>

            <div className="dashboard-distribution-layout">
              <div
                aria-hidden="true"
                className="dashboard-donut"
                style={{ backgroundImage: buildDonutBackground(dashboardMailboxDistribution) }}
              >
                <div className="dashboard-donut-center">
                  <strong>326</strong>
                  <span>总邮箱</span>
                </div>
              </div>

              <div className="dashboard-list">
                {dashboardMailboxDistribution.map((slice) => (
                  <div className="dashboard-list-row" key={slice.label}>
                    <span className="dashboard-list-label">
                      <i className="dashboard-dot" style={{ backgroundColor: slice.tone }} />
                      {slice.label}
                    </span>
                    <strong>{slice.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel workspace-card dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <p className="panel-kicker">角色</p>
                <h2>用户角色结构</h2>
              </div>
              <p className="section-copy dashboard-panel-copy">避免双环图拥挤，直接用后台可读性更强的列表 + 占比展示。</p>
            </div>

            <div className="dashboard-role-list">
              {dashboardUserRoles.map((role) => (
                <article className="dashboard-role-card" key={role.label}>
                  <span className="dashboard-list-label">
                    <i className="dashboard-dot" style={{ backgroundColor: role.tone }} />
                    {role.label}
                  </span>
                  <strong>{role.value}%</strong>
                  <span>{Math.round((role.value / 100) * 89)} 人</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="panel workspace-card dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <p className="panel-kicker">增长</p>
              <h2>账号 / 邮箱增长</h2>
            </div>
            <p className="section-copy dashboard-panel-copy">补充看平台扩张情况，用柱状对比新增账号和新增邮箱。</p>
          </div>

          <div className="dashboard-growth-chart" aria-label="账号和邮箱增长图" role="img">
            {dashboardGrowth.map((point) => (
              <div className="dashboard-growth-group" key={point.label}>
                <div className="dashboard-growth-bars">
                  <span
                    className="dashboard-growth-bar accounts"
                    style={{ height: `${(point.accounts / growthMax) * 100}%` }}
                    title={`新增账号 ${point.accounts}`}
                  />
                  <span
                    className="dashboard-growth-bar mailboxes"
                    style={{ height: `${(point.mailboxes / growthMax) * 100}%` }}
                    title={`新增邮箱 ${point.mailboxes}`}
                  />
                </div>
                <small>{point.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel workspace-card dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <p className="panel-kicker">资源</p>
              <h2>重点资源概览</h2>
            </div>
            <p className="section-copy dashboard-panel-copy">先不放告警区，改成轻量管理概览，方便管理员快速理解资源状态。</p>
          </div>

          <div className="dashboard-resource-table">
            {dashboardResources.map((row) => (
              <div className="dashboard-resource-row" key={row.label}>
                <strong>{row.label}</strong>
                <span>{row.value}</span>
                <small>{row.detail}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
