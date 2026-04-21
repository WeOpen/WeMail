import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";

import { useWorkspaceTheme } from "../app/useWorkspaceTheme";
import {
  dashboardGrowth,
  dashboardKpis,
  dashboardMailboxDistribution,
  dashboardResources,
  dashboardTrend,
  dashboardUserRoles
} from "../features/dashboard/dashboardMockData";
import { nivoTheme } from "../shared/chart";

const GROWTH_KEYS = ["accounts", "mailboxes"] as const;
const GROWTH_LABELS: Record<(typeof GROWTH_KEYS)[number], string> = {
  accounts: "新增账号",
  mailboxes: "新增邮箱"
};

const INBOUND_COLOR = "#ff7a00";

export function DashboardPage() {
  const { theme } = useWorkspaceTheme();
  const contrastColor = theme === "dark" ? "#f5f5f5" : "#111827";

  const trendData = useMemo(
    () => [
      {
        id: "收件量",
        color: INBOUND_COLOR,
        data: dashboardTrend.map((point) => ({ x: point.day, y: point.inbound }))
      },
      {
        id: "发件量",
        color: contrastColor,
        data: dashboardTrend.map((point) => ({ x: point.day, y: point.outbound }))
      }
    ],
    [contrastColor]
  );

  const distributionData = useMemo(
    () =>
      dashboardMailboxDistribution.map((slice) => ({
        id: slice.label,
        label: slice.label,
        value: slice.value,
        color: slice.tone
      })),
    []
  );

  const growthColors = useMemo<Record<(typeof GROWTH_KEYS)[number], string>>(
    () => ({ accounts: contrastColor, mailboxes: INBOUND_COLOR }),
    [contrastColor]
  );

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
              <i className="dashboard-dot" style={{ backgroundColor: INBOUND_COLOR }} />
              收件量
            </span>
            <span>
              <i className="dashboard-dot" style={{ backgroundColor: contrastColor }} />
              发件量
            </span>
          </div>

          <div className="dashboard-trend-chart" role="img" aria-label="近 7 天收发趋势图">
            <ResponsiveLine
              animate={false}
              axisBottom={{ tickSize: 0, tickPadding: 12 }}
              axisLeft={{ tickSize: 0, tickPadding: 10, tickValues: 4 }}
              colors={{ datum: "color" }}
              curve="monotoneX"
              data={trendData}
              enableArea
              areaOpacity={0.08}
              enableGridX={false}
              gridYValues={4}
              lineWidth={3}
              margin={{ top: 24, right: 24, bottom: 40, left: 48 }}
              pointBorderColor={{ from: "serieColor" }}
              pointBorderWidth={2}
              pointSize={7}
              theme={nivoTheme}
              useMesh
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto" }}
            />
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
              <div className="dashboard-donut" role="img" aria-label="邮箱状态分布环形图">
                <ResponsivePie
                  activeOuterRadiusOffset={4}
                  animate={false}
                  borderWidth={0}
                  colors={{ datum: "data.color" }}
                  cornerRadius={4}
                  data={distributionData}
                  enableArcLabels={false}
                  enableArcLinkLabels={false}
                  innerRadius={0.62}
                  margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  padAngle={1.5}
                  theme={nivoTheme}
                />
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

          <div className="dashboard-growth-chart" role="img" aria-label="账号和邮箱增长图">
            <ResponsiveBar
              animate={false}
              axisBottom={{ tickSize: 0, tickPadding: 12 }}
              axisLeft={{ tickSize: 0, tickPadding: 10, tickValues: 4 }}
              borderRadius={6}
              colors={({ id }) => growthColors[id as keyof typeof growthColors]}
              data={dashboardGrowth.map((point) => ({ ...point }))}
              enableGridY
              enableLabel={false}
              gridYValues={4}
              groupMode="grouped"
              indexBy="label"
              innerPadding={4}
              keys={[...GROWTH_KEYS]}
              margin={{ top: 16, right: 16, bottom: 36, left: 40 }}
              padding={0.32}
              theme={nivoTheme}
              tooltipLabel={({ id }) => GROWTH_LABELS[id as keyof typeof GROWTH_LABELS]}
            />
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
