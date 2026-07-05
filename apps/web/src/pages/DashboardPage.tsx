import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Inbox, KeyRound, Megaphone, Send, Webhook as WebhookIcon, type LucideIcon } from "lucide-react";

import { useWorkspaceTheme } from "../app/useWorkspaceTheme";
import {
  fetchDashboard,
  type DashboardPayload
} from "../features/dashboard/api";
import { Button } from "../shared/button";
import { nivoTheme } from "../shared/chart";
import { MetricCard } from "../shared/metric-card";
import { Skeleton } from "../shared/skeleton";
import { ViewportDeferred } from "../shared/ViewportDeferred";

const GROWTH_KEYS = ["accounts", "mailboxes"] as const;
const GROWTH_LABELS: Record<(typeof GROWTH_KEYS)[number], string> = {
  accounts: "新增账号",
  mailboxes: "新增邮箱"
};

const INBOUND_COLOR = "#ff7a00";
const KPI_ICONS = [Inbox, Send, KeyRound, WebhookIcon, Megaphone] satisfies LucideIcon[];
const ResponsiveBarChart = lazy(() => import("@nivo/bar").then((module) => ({ default: module.ResponsiveBar })));
const ResponsiveLineChart = lazy(() => import("@nivo/line").then((module) => ({ default: module.ResponsiveLine })));
const ResponsivePieChart = lazy(() => import("@nivo/pie").then((module) => ({ default: module.ResponsivePie })));
const TREND_RANGE_OPTIONS = [
  { label: "周", value: "week" },
  { label: "月", value: "month" },
  { label: "年", value: "year" }
] as const;
type DashboardRange = (typeof TREND_RANGE_OPTIONS)[number]["value"];
type DashboardPageProps = {
  canViewRoleCard?: boolean;
};
const emptyDashboard: DashboardPayload = {
  kpis: [
    { kicker: "今日收件", label: "收件总量", value: "0", detail: "暂无收件数据", change: "较昨日 0" },
    { kicker: "今日发件", label: "发件总量", value: "0", detail: "暂无发件数据", change: "失败重试 0 次" },
    { kicker: "API 密钥数", label: "活跃密钥", value: "0", detail: "0 个正在使用", change: "0 个待轮换" },
    { kicker: "Webhook", label: "投递端点", value: "0", detail: "0 个正常投递", change: "失败重试 0 次" },
    { kicker: "公告", label: "已发布公告", value: "0", detail: "0 条正在展示", change: "本周发布 0 条" }
  ],
  trend: {
    week: [],
    month: [],
    year: []
  },
  accountDistribution: [],
  accountTotal: 0,
  resources: [],
  growth: {
    week: [],
    month: [],
    year: []
  },
  userRoles: [],
  userTotal: 0
};

function resolveDashboardTone(tone: string, contrastColor: string, theme: string) {
  if (tone === "#111827") return contrastColor;
  if (tone === "#e5e7eb") return theme === "dark" ? "#2e2e34" : tone;
  return tone;
}

function DashboardChartSkeleton({ variant = "area" }: { variant?: "area" | "donut" }) {
  if (variant === "donut") {
    return <Skeleton animated className="dashboard-chart-skeleton dashboard-chart-skeleton-donut" rounded="full" />;
  }

  return (
    <div className="dashboard-chart-skeleton dashboard-chart-skeleton-area">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton animated height={1} key={index} rounded="full" width="100%" />
      ))}
      <Skeleton animated height={96} rounded="lg" width="100%" />
    </div>
  );
}

export function DashboardPage({ canViewRoleCard = false }: DashboardPageProps) {
  const { theme } = useWorkspaceTheme();
  const contrastColor = theme === "dark" ? "#f5f5f5" : "#111827";
  const [trendRange, setTrendRange] = useState<DashboardRange>("week");
  const [growthRange, setGrowthRange] = useState<DashboardRange>("week");
  const [dashboard, setDashboard] = useState<DashboardPayload>(emptyDashboard);

  useEffect(() => {
    let cancelled = false;
    void fetchDashboard()
      .then((payload) => {
        if (!cancelled) setDashboard(payload);
      })
      .catch(() => {
        if (!cancelled) setDashboard(emptyDashboard);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accountDistribution = useMemo(
    () =>
      dashboard.accountDistribution.map((slice) => ({
        ...slice,
        tone: resolveDashboardTone(slice.tone, contrastColor, theme)
      })),
    [contrastColor, dashboard.accountDistribution, theme]
  );

  const userRoles = useMemo(
    () =>
      dashboard.userRoles.map((role) => ({
        ...role,
        tone: resolveDashboardTone(role.tone, contrastColor, theme)
      })),
    [contrastColor, dashboard.userRoles, theme]
  );

  const resources = useMemo(
    () =>
      dashboard.resources.map((resource) => ({
        ...resource,
        tone: resolveDashboardTone(resource.tone, contrastColor, theme)
      })),
    [contrastColor, dashboard.resources, theme]
  );

  const trendData = useMemo(
    () => [
      {
        id: "收件量",
        color: INBOUND_COLOR,
        data: dashboard.trend[trendRange].map((point) => ({ x: point.day, y: point.inbound }))
      },
      {
        id: "发件量",
        color: contrastColor,
        data: dashboard.trend[trendRange].map((point) => ({ x: point.day, y: point.outbound }))
      }
    ],
    [contrastColor, dashboard.trend, trendRange]
  );
  const hasTrendData = trendData.some((series) => series.data.length > 0);

  const distributionData = useMemo(
    () =>
      accountDistribution
        .filter((slice) => slice.value > 0)
        .map((slice) => ({
          id: slice.label,
          label: slice.label,
          value: slice.value,
          color: slice.tone
        })),
    [accountDistribution]
  );

  const roleDistributionData = useMemo(
    () =>
      userRoles
        .filter((role) => role.value > 0)
        .map((role) => ({
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
  const growthData = useMemo(() => dashboard.growth[growthRange].map((point) => ({ ...point })), [dashboard.growth, growthRange]);
  const hasGrowthData = growthData.length > 0;

  return (
    <main className="workspace-grid dashboard-grid">
      <section className="dashboard-kpi-grid" aria-label="仪表盘核心指标">
        {dashboard.kpis.map((kpi, index) => {
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
                <Button
                  aria-selected={trendRange === option.value}
                  className="dashboard-trend-tab"
                  contentLayout="plain"
                  key={option.value}
                  onClick={() => setTrendRange(option.value)}
                  role="tab"
                  type="button"
                  variant="text"
                >
                  {option.label}
                </Button>
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
            {hasTrendData ? (
              <ViewportDeferred fallback={<DashboardChartSkeleton />}>
                <Suspense fallback={<DashboardChartSkeleton />}>
                  <ResponsiveLineChart
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
                </Suspense>
              </ViewportDeferred>
            ) : null}
          </div>
        </section>

        <section className="panel workspace-card dashboard-panel dashboard-composition-panel">
          <div className="dashboard-composition-section">
            <div className="dashboard-panel-head">
              <h2 className="panel-kicker dashboard-panel-title">账号</h2>
            </div>

            <div className="dashboard-distribution-layout">
              <div className="dashboard-donut" role="img" aria-label="账号结构环形图">
                {distributionData.length > 0 ? (
                  <ViewportDeferred fallback={<DashboardChartSkeleton variant="donut" />}>
                    <Suspense fallback={<DashboardChartSkeleton variant="donut" />}>
                      <ResponsivePieChart
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
                    </Suspense>
                  </ViewportDeferred>
                ) : null}
                <div className="dashboard-donut-center">
                  <strong>{dashboard.accountTotal}</strong>
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
                <Button
                  aria-selected={growthRange === option.value}
                  className="dashboard-trend-tab"
                  contentLayout="plain"
                  key={option.value}
                  onClick={() => setGrowthRange(option.value)}
                  role="tab"
                  type="button"
                  variant="text"
                >
                  {option.label}
                </Button>
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
            {hasGrowthData ? (
              <ViewportDeferred fallback={<DashboardChartSkeleton />}>
                <Suspense fallback={<DashboardChartSkeleton />}>
                  <ResponsiveBarChart
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
                </Suspense>
              </ViewportDeferred>
            ) : null}
          </div>
        </section>

        {canViewRoleCard ? (
          <section className="panel workspace-card dashboard-panel dashboard-role-distribution-panel">
            <div className="dashboard-panel-head">
              <h2 className="panel-kicker dashboard-panel-title">角色</h2>
            </div>

            <div className="dashboard-distribution-layout">
              <div className="dashboard-donut" role="img" aria-label="用户角色环形图">
                {roleDistributionData.length > 0 ? (
                  <ViewportDeferred fallback={<DashboardChartSkeleton variant="donut" />}>
                    <Suspense fallback={<DashboardChartSkeleton variant="donut" />}>
                      <ResponsivePieChart
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
                    </Suspense>
                  </ViewportDeferred>
                ) : null}
                <div className="dashboard-donut-center">
                  <strong>{dashboard.userTotal}</strong>
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
