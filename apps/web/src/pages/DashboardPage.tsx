import { useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { Inbox, KeyRound, Megaphone, Send, Webhook as WebhookIcon, type LucideIcon } from "lucide-react";

import { useWorkspaceTheme } from "../app/useWorkspaceTheme";
import {
  dashboardAccountDistribution,
  dashboardGrowth,
  dashboardKpis,
  dashboardResources,
  dashboardTrend,
  dashboardUserRoles
} from "../features/dashboard/dashboardMockData";
import { nivoTheme } from "../shared/chart";
import { MetricCard } from "../shared/metric-card";

const GROWTH_KEYS = ["accounts", "mailboxes"] as const;
const GROWTH_LABELS: Record<(typeof GROWTH_KEYS)[number], string> = {
  accounts: "新增账号",
  mailboxes: "新增邮箱"
};

const INBOUND_COLOR = "#ff7a00";
const KPI_ICONS = [Inbox, Send, KeyRound, WebhookIcon, Megaphone] satisfies LucideIcon[];
const TREND_RANGE_OPTIONS = [
  { label: "周", value: "week" },
  { label: "月", value: "month" },
  { label: "年", value: "year" }
] as const;
type DashboardRange = (typeof TREND_RANGE_OPTIONS)[number]["value"];
type DashboardPageProps = {
  canViewRoleCard?: boolean;
};
const TREND_RANGE_POINTS = {
  week: dashboardTrend,
  month: [
    { day: "第 1 周", inbound: 41800, outbound: 3840 },
    { day: "第 2 周", inbound: 46240, outbound: 4210 },
    { day: "第 3 周", inbound: 49360, outbound: 4630 },
    { day: "第 4 周", inbound: 52880, outbound: 4910 }
  ],
  year: [
    { day: "1 月", inbound: 168000, outbound: 14800 },
    { day: "2 月", inbound: 182400, outbound: 16320 },
    { day: "3 月", inbound: 196800, outbound: 17840 },
    { day: "4 月", inbound: 214200, outbound: 19120 },
    { day: "5 月", inbound: 228600, outbound: 20480 },
    { day: "6 月", inbound: 241800, outbound: 21960 }
  ]
} satisfies Record<DashboardRange, typeof dashboardTrend>;
const GROWTH_RANGE_POINTS = {
  week: dashboardGrowth,
  month: [
    { label: "第 1 周", accounts: 8, mailboxes: 26 },
    { label: "第 2 周", accounts: 12, mailboxes: 34 },
    { label: "第 3 周", accounts: 10, mailboxes: 31 },
    { label: "第 4 周", accounts: 14, mailboxes: 39 }
  ],
  year: [
    { label: "1 月", accounts: 24, mailboxes: 91 },
    { label: "2 月", accounts: 31, mailboxes: 118 },
    { label: "3 月", accounts: 28, mailboxes: 104 },
    { label: "4 月", accounts: 36, mailboxes: 132 },
    { label: "5 月", accounts: 42, mailboxes: 148 },
    { label: "6 月", accounts: 39, mailboxes: 137 }
  ]
} satisfies Record<DashboardRange, typeof dashboardGrowth>;

function resolveDashboardTone(tone: string, contrastColor: string, theme: string) {
  if (tone === "#111827") return contrastColor;
  if (tone === "#e5e7eb") return theme === "dark" ? "#2e2e34" : tone;
  return tone;
}

export function DashboardPage({ canViewRoleCard = false }: DashboardPageProps) {
  const { theme } = useWorkspaceTheme();
  const contrastColor = theme === "dark" ? "#f5f5f5" : "#111827";
  const [trendRange, setTrendRange] = useState<DashboardRange>("week");
  const [growthRange, setGrowthRange] = useState<DashboardRange>("week");

  const accountDistribution = useMemo(
    () =>
      dashboardAccountDistribution.map((slice) => ({
        ...slice,
        tone: resolveDashboardTone(slice.tone, contrastColor, theme)
      })),
    [contrastColor, theme]
  );

  const userRoles = useMemo(
    () =>
      dashboardUserRoles.map((role) => ({
        ...role,
        tone: resolveDashboardTone(role.tone, contrastColor, theme)
      })),
    [contrastColor, theme]
  );

  const resources = useMemo(
    () =>
      dashboardResources.map((resource) => ({
        ...resource,
        tone: resolveDashboardTone(resource.tone, contrastColor, theme)
      })),
    [contrastColor, theme]
  );

  const trendData = useMemo(
    () => [
      {
        id: "收件量",
        color: INBOUND_COLOR,
        data: TREND_RANGE_POINTS[trendRange].map((point) => ({ x: point.day, y: point.inbound }))
      },
      {
        id: "发件量",
        color: contrastColor,
        data: TREND_RANGE_POINTS[trendRange].map((point) => ({ x: point.day, y: point.outbound }))
      }
    ],
    [contrastColor, trendRange]
  );

  const distributionData = useMemo(
    () =>
      accountDistribution.map((slice) => ({
        id: slice.label,
        label: slice.label,
        value: slice.value,
        color: slice.tone
      })),
    [accountDistribution]
  );

  const roleDistributionData = useMemo(
    () =>
      userRoles.map((role) => ({
        id: role.label,
        label: role.label,
        value: role.value,
        color: role.tone
      })),
    [userRoles]
  );

  const growthColors = useMemo<Record<(typeof GROWTH_KEYS)[number], string>>(
    () => ({ accounts: contrastColor, mailboxes: INBOUND_COLOR }),
    [contrastColor]
  );
  const growthData = useMemo(() => GROWTH_RANGE_POINTS[growthRange].map((point) => ({ ...point })), [growthRange]);

  return (
    <main className="workspace-grid dashboard-grid">
      <section className="dashboard-kpi-grid" aria-label="仪表盘核心指标">
        {dashboardKpis.map((kpi, index) => {
          const KpiIcon = KPI_ICONS[index] ?? Inbox;
          return (
            <MetricCard
              className={`panel workspace-card dashboard-kpi-card${index === 0 ? " dashboard-kpi-card-featured" : ""}`}
              caption={kpi.change}
              detail={kpi.detail}
              key={kpi.label}
              kicker={kpi.kicker}
              title={kpi.label}
              tone="hero"
              value={kpi.value}
              valueSize={index === 0 ? "xl" : "lg"}
              visualIcon={<KpiIcon absoluteStrokeWidth aria-hidden="true" strokeWidth={1.7} />}
            />
          );
        })}
      </section>

      <div className="dashboard-main-grid">
        <section className="panel workspace-card dashboard-panel dashboard-trend-panel">
          <div className="dashboard-panel-head">
            <h2 className="panel-kicker dashboard-panel-title">趋势</h2>
            <div className="dashboard-trend-tabs" aria-label="趋势周期" role="tablist">
              {TREND_RANGE_OPTIONS.map((option) => (
                <button
                  aria-selected={trendRange === option.value}
                  className="dashboard-trend-tab"
                  key={option.value}
                  onClick={() => setTrendRange(option.value)}
                  role="tab"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
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

          <div className="dashboard-trend-chart" role="img" aria-label="收发趋势图">
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

        <section className="panel workspace-card dashboard-panel dashboard-composition-panel">
          <div className="dashboard-composition-section">
            <div className="dashboard-panel-head">
              <h2 className="panel-kicker dashboard-panel-title">账号</h2>
            </div>

            <div className="dashboard-distribution-layout">
              <div className="dashboard-donut" role="img" aria-label="账号结构环形图">
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
                  <strong>89</strong>
                  <span>总账号</span>
                </div>
              </div>

              <div className="dashboard-list">
                {accountDistribution.map((slice) => (
                  <div className="dashboard-list-row" key={slice.label}>
                    <span className="dashboard-list-label">
                      <i className="dashboard-dot" style={{ backgroundColor: slice.tone }} />
                      {slice.label}
                    </span>
                    <strong>{slice.value}%</strong>
                    <span className="dashboard-list-track" aria-hidden="true">
                      <span style={{ backgroundColor: slice.tone, width: `${slice.value}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard-composition-section dashboard-composition-section-divided">
            <div className="dashboard-panel-head">
              <h2 className="panel-kicker dashboard-panel-title">资源</h2>
            </div>

            <div className="dashboard-role-list">
              {resources.map((resource) => (
                <article className="dashboard-role-card" key={resource.label}>
                  <span className="dashboard-list-label">
                    <i className="dashboard-dot" style={{ backgroundColor: resource.tone }} />
                    {resource.label}
                  </span>
                  <strong>{resource.value}</strong>
                  <span className="dashboard-role-meta">{resource.detail}</span>
                  <span className="dashboard-list-track" aria-hidden="true">
                    <span style={{ backgroundColor: resource.tone, width: `${resource.progress}%` }} />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className={`dashboard-bottom-grid${canViewRoleCard ? "" : " dashboard-bottom-grid-single"}`}>
        <section className="panel workspace-card dashboard-panel dashboard-growth-panel">
          <div className="dashboard-panel-head">
            <h2 className="panel-kicker dashboard-panel-title">增长</h2>
            <div className="dashboard-trend-tabs" aria-label="增长周期" role="tablist">
              {TREND_RANGE_OPTIONS.map((option) => (
                <button
                  aria-selected={growthRange === option.value}
                  className="dashboard-trend-tab"
                  key={option.value}
                  onClick={() => setGrowthRange(option.value)}
                  role="tab"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-trend-legend dashboard-growth-legend" aria-hidden="true">
            <span>
              <i className="dashboard-dot" style={{ backgroundColor: growthColors.accounts }} />
              新增账号
            </span>
            <span>
              <i className="dashboard-dot" style={{ backgroundColor: growthColors.mailboxes }} />
              新增邮箱
            </span>
          </div>

          <div className="dashboard-growth-chart" role="img" aria-label="账号和邮箱增长图">
            <ResponsiveBar
              animate={false}
              axisBottom={{ tickSize: 0, tickPadding: 12 }}
              axisLeft={{ tickSize: 0, tickPadding: 10, tickValues: 4 }}
              borderRadius={6}
              colors={({ id }) => growthColors[id as keyof typeof growthColors]}
              data={growthData}
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

        {canViewRoleCard ? (
          <section className="panel workspace-card dashboard-panel dashboard-role-distribution-panel">
            <div className="dashboard-panel-head">
              <h2 className="panel-kicker dashboard-panel-title">角色</h2>
            </div>

            <div className="dashboard-distribution-layout">
              <div className="dashboard-donut" role="img" aria-label="用户角色环形图">
                <ResponsivePie
                  activeOuterRadiusOffset={4}
                  animate={false}
                  borderWidth={0}
                  colors={{ datum: "data.color" }}
                  cornerRadius={4}
                  data={roleDistributionData}
                  enableArcLabels={false}
                  enableArcLinkLabels={false}
                  innerRadius={0.62}
                  margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  padAngle={1.5}
                  theme={nivoTheme}
                />
                <div className="dashboard-donut-center">
                  <strong>89</strong>
                  <span>总用户</span>
                </div>
              </div>

              <div className="dashboard-list">
                {userRoles.map((role) => (
                  <div className="dashboard-list-row" key={role.label}>
                    <span className="dashboard-list-label">
                      <i className="dashboard-dot" style={{ backgroundColor: role.tone }} />
                      {role.label}
                    </span>
                    <strong>{role.value}%</strong>
                    <span className="dashboard-list-track" aria-hidden="true">
                      <span style={{ backgroundColor: role.tone, width: `${role.value}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
