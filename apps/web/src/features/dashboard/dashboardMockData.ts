export type DashboardKpi = {
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
};

export const dashboardKpis: DashboardKpi[] = [
  { label: "今日收件", value: "12,480", detail: "近 24 小时平台收件总量", change: "较昨日 +8.4%" },
  { label: "今日发件", value: "1,284", detail: "平均成功率 97.8%", change: "失败重试 26 次" },
  { label: "活跃邮箱", value: "326", detail: "占总邮箱 74%", change: "高频邮箱 42 个" },
  { label: "平台用户", value: "89", detail: "管理员 12 / 成员 77", change: "本周新增 7 人" },
  { label: "功能开关", value: "3 / 4", detail: "AI、Telegram、外发已启用", change: "邮箱创建已关闭" }
];

export const dashboardTrend: DashboardTrendPoint[] = [
  { day: "周四", inbound: 9200, outbound: 860 },
  { day: "周五", inbound: 10120, outbound: 942 },
  { day: "周六", inbound: 11240, outbound: 1018 },
  { day: "周日", inbound: 10960, outbound: 978 },
  { day: "周一", inbound: 12640, outbound: 1156 },
  { day: "周二", inbound: 13220, outbound: 1248 },
  { day: "周三", inbound: 12480, outbound: 1284 }
];

export const dashboardMailboxDistribution: DashboardDistributionSlice[] = [
  { label: "活跃邮箱", value: 44, tone: "#111827" },
  { label: "待分配账号", value: 31, tone: "#ff7a00" },
  { label: "暂停邮箱", value: 18, tone: "#ffcf99" },
  { label: "测试邮箱", value: 7, tone: "#e5e7eb" }
];

export const dashboardUserRoles: DashboardDistributionSlice[] = [
  { label: "管理员", value: 13, tone: "#111827" },
  { label: "运营成员", value: 61, tone: "#ff7a00" },
  { label: "只读成员", value: 26, tone: "#ffd8b0" }
];

export const dashboardGrowth: DashboardGrowthPoint[] = [
  { label: "上周", accounts: 2, mailboxes: 8 },
  { label: "本周一", accounts: 3, mailboxes: 10 },
  { label: "本周二", accounts: 2, mailboxes: 7 },
  { label: "本周三", accounts: 5, mailboxes: 12 },
  { label: "本周四", accounts: 4, mailboxes: 11 }
];

export const dashboardResources: DashboardResourceRow[] = [
  { label: "可用邀请码", value: "18 个", detail: "本周新建 6 个" },
  { label: "默认配额池", value: "20 / 天", detail: "12 个用户继承默认额度" },
  { label: "最近新增账号", value: "7 个", detail: "近 48 小时新增接入" }
];
