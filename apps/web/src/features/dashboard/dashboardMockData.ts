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

export const dashboardKpis: DashboardKpi[] = [
  { kicker: "今日收件", label: "收件总量", value: "12,480", detail: "近 24 小时平台收件总量", change: "较昨日 +8.4%" },
  { kicker: "今日发件", label: "发件总量", value: "1,284", detail: "平均成功率 97.8%", change: "失败重试 26 次" },
  { kicker: "API 密钥数", label: "活跃密钥", value: "12", detail: "9 个正在使用", change: "3 个待轮换" },
  { kicker: "Webhook", label: "投递端点", value: "6", detail: "5 个正常投递", change: "失败重试 3 次" },
  { kicker: "公告", label: "已发布公告", value: "4", detail: "2 条正在展示", change: "本周发布 1 条" }
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

export const dashboardAccountDistribution: DashboardDistributionSlice[] = [
  { label: "活跃账号", value: 72, tone: "#111827" },
  { label: "待激活账号", value: 17, tone: "#ff7a00" },
  { label: "暂停账号", value: 11, tone: "#ffcf99" }
];

export const dashboardUserRoles: DashboardDistributionSlice[] = [
  { label: "管理员", value: 13, tone: "#111827" },
  { label: "成员", value: 87, tone: "#ff7a00" }
];

export const dashboardGrowth: DashboardGrowthPoint[] = [
  { label: "上周", accounts: 2, mailboxes: 8 },
  { label: "本周一", accounts: 3, mailboxes: 10 },
  { label: "本周二", accounts: 2, mailboxes: 7 },
  { label: "本周三", accounts: 5, mailboxes: 12 },
  { label: "本周四", accounts: 4, mailboxes: 11 }
];

export const dashboardResources: DashboardResourceRow[] = [
  { label: "可用邀请码", value: "18 个", detail: "本周新建 6 个", progress: 72, tone: "#111827" },
  { label: "默认配额池", value: "20 / 天", detail: "12 个用户继承默认额度", progress: 60, tone: "#ff7a00" }
];
