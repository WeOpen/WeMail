import { apiFetch } from "../../shared/api/client";

export type DashboardKpi = {
  kicker: string;
  label: string;
  value: string;
  detail: string;
  change: string;
};

export type DashboardTrendPoint = {
  day: string;
  inbound: number;
  outbound: number;
};

export type DashboardDistributionSlice = {
  label: string;
  value: number;
  tone: string;
};

export type DashboardGrowthPoint = {
  label: string;
  accounts: number;
  mailboxes: number;
};

export type DashboardResourceRow = {
  label: string;
  value: string;
  detail: string;
  progress: number;
  tone: string;
};

export type DashboardPayload = {
  kpis: DashboardKpi[];
  trend: Record<"week" | "month" | "year", DashboardTrendPoint[]>;
  accountDistribution: DashboardDistributionSlice[];
  accountTotal: number;
  resources: DashboardResourceRow[];
  growth: Record<"week" | "month" | "year", DashboardGrowthPoint[]>;
  userRoles: DashboardDistributionSlice[];
  userTotal: number;
};

export function fetchDashboard() {
  return apiFetch<DashboardPayload>("/api/dashboard");
}
