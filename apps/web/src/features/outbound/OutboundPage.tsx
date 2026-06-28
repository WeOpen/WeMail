import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  FileJson,
  FileText,
  Gauge,
  Inbox,
  Network,
  RefreshCw,
  Repeat2,
  SearchX,
  Send,
  ShieldCheck,
  XCircle,
  type LucideIcon
} from "lucide-react";

import type {
  MailboxSummary,
  MailSettingsWorkspaceDefaults,
  OutboundListStatus,
  OutboundMaturitySummary,
  OutboundTemplateSummary,
  SystemDiagnosticStatus
} from "@wemail/shared";

import { Button } from "../../shared/button";
import { EmptyState } from "../../shared/empty-state";
import { FilterBar } from "../../shared/filter-bar";
import { FormField, SearchInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { Page, PageBody, PageHeader, PageMain, PageSidebar, PageToolbar } from "../../shared/page-layout";
import { Pagination } from "../../shared/pagination";
import { Tabs, TabsList, TabsTrigger } from "../../shared/tabs";
import type { OutboundHistoryDetail, OutboundHistoryItem, OutboundHistorySummary } from "../inbox/types";
import { fetchOutboundMaturity, type OutboundListQueryInput } from "../inbox/api";
import { fetchMailSettings } from "../settings/api";
import { OutboundComposeDrawer } from "./OutboundComposeDrawer";

type OutboundFilter = "all" | "sent" | "failed";
type OutboundRecordStatus = "已发送" | "失败";

type OutboundRecord = {
  id: string;
  toAddress: string;
  subject: string;
  status: OutboundRecordStatus;
  summary: string;
  createdAtLabel: string;
  payloadPreview: string;
  failureReason: string | null;
  raw: OutboundHistoryItem;
};

type OutboundPageProps = {
  activeMailbox: MailboxSummary | null;
  mailboxes: MailboxSummary[];
  outboundHistory: OutboundHistoryItem[];
  outboundTotal: number;
  outboundPage: number;
  outboundPageSize: number;
  outboundSummary: OutboundHistorySummary;
  isLoadingOutbound: boolean;
  outboundError: string | null;
  selectedMailboxId: string | null;
  onLoadOutboundDetail: (messageId: string) => Promise<OutboundHistoryDetail>;
  onRefreshOutbound: (query?: string | OutboundListQueryInput | null) => Promise<void> | void;
  onSelectMailbox: (mailboxId: string | null) => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

const outboundPageSizeOptions = [6, 12] as const;
const initialOutboundPageSize = 6;
const outboundFilters: Array<{ icon: LucideIcon; label: string; value: OutboundFilter }> = [
  { icon: Inbox, label: "全部", value: "all" },
  { icon: CheckCircle2, label: "已发送", value: "sent" },
  { icon: XCircle, label: "失败", value: "failed" }
];

function getFilterFromSearchParams(searchParams: URLSearchParams): OutboundFilter {
  const view = searchParams.get("view");
  if (view === "sent") return "sent";
  if (view === "failed" || view === "exceptions") return "failed";
  return "all";
}

function getFilterFromSettings(value: string | undefined): OutboundFilter {
  if (value === "已发送") return "sent";
  if (value === "失败" || value === "异常 / 无匹配") return "failed";
  return "all";
}

function matchFilter(record: OutboundRecord, filter: OutboundFilter) {
  if (filter === "sent") return record.status === "已发送";
  if (filter === "failed") return record.status === "失败";
  return true;
}

function toOutboundApiStatus(filter: OutboundFilter): OutboundListStatus {
  if (filter === "sent") return "sent";
  if (filter === "failed") return "failed";
  return "all";
}

function pickSelectedRecord(records: OutboundRecord[], selectedRecordId: string | null, preferFailedRecord: boolean) {
  if (selectedRecordId) {
    const exact = records.find((record) => record.id === selectedRecordId);
    if (exact) return exact;
  }

  if (preferFailedRecord) {
    const failedRecord = records.find((record) => record.status === "失败");
    if (failedRecord) return failedRecord;
  }

  return records[0] ?? null;
}

function formatOutboundDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function buildOutboundRecords(history: OutboundHistoryItem[]) {
  return history.map((item) => ({
    id: item.id,
    toAddress: item.toAddress,
    subject: item.subject,
    status: item.status === "failed" ? "失败" : "已发送",
    summary: item.errorText ?? "已发送到收件人。",
    createdAtLabel: formatOutboundDate(item.createdAt),
    payloadPreview: item.requestPayloadJson ?? JSON.stringify({ toAddress: item.toAddress, subject: item.subject }, null, 2),
    failureReason: item.errorText,
    raw: item
  })) satisfies OutboundRecord[];
}

function getFilterCount(records: OutboundRecord[], filter: OutboundFilter) {
  return records.filter((record) => matchFilter(record, filter)).length;
}

function getStatusLabel(status: SystemDiagnosticStatus) {
  if (status === "ok") return "正常";
  if (status === "error") return "需处理";
  return "待核对";
}

function getOutboundMaturityStatus(summary: OutboundMaturitySummary): SystemDiagnosticStatus {
  if (!summary.featureEnabled || !summary.resendConfigured) return "warning";
  if (summary.identities.some((identity) => identity.status === "error")) return "error";
  if (summary.dnsChecks.some((check) => check.status === "error")) return "error";
  if (summary.identities.some((identity) => identity.status === "warning")) return "warning";
  if (summary.dnsChecks.some((check) => check.status === "warning")) return "warning";
  if (summary.failureStats.failed > 0) return "warning";
  return "ok";
}

function getQuotaRemaining(summary: OutboundMaturitySummary) {
  return Math.max(0, summary.quota.dailyLimit - summary.quota.sendsToday);
}

function getEmptyCopy(filter: OutboundFilter, hasSearch: boolean) {
  if (hasSearch) {
    return {
      title: "没有匹配的发件记录",
      description: "换一个收件人、主题或结果关键词再试一次。"
    };
  }

  if (filter === "failed") {
    return {
      title: "暂无失败发件记录",
      description: "当前发件结果没有失败项。"
    };
  }

  if (filter === "sent") {
    return {
      title: "暂无已发送记录",
      description: "发送成功的邮件会显示在这里。"
    };
  }

  return {
    title: "暂无发件记录",
    description: "使用右上角的新建发送后，真实发送记录会显示在这里。"
  };
}

function filterMailboxes(mailboxes: MailboxSummary[], searchValue: string) {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) return mailboxes;

  return mailboxes.filter((mailbox) => {
    return [mailbox.label, mailbox.address].join(" ").toLowerCase().includes(normalizedSearch);
  });
}

function StatCard({
  detail,
  icon: Icon,
  label,
  tone,
  value
}: {
  detail: ReactNode;
  icon: LucideIcon;
  label: string;
  tone: "neutral" | "success" | "danger" | "warning";
  value: ReactNode;
}) {
  return (
    <div className="outbound-stat-card" data-tone={tone}>
      <span className="outbound-stat-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function OutboundPage({
  activeMailbox,
  mailboxes,
  outboundError,
  outboundHistory,
  outboundPage,
  outboundSummary,
  outboundTotal,
  isLoadingOutbound,
  onLoadOutboundDetail,
  onRefreshOutbound,
  onSelectMailbox,
  onSendMail
}: OutboundPageProps) {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutboundFilter>(() => getFilterFromSearchParams(searchParams));
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<{ toAddress?: string; subject?: string; bodyText?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialOutboundPageSize);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMailboxSwitcherOpen, setIsMailboxSwitcherOpen] = useState(false);
  const [mailboxSearchValue, setMailboxSearchValue] = useState("");
  const [rawDetail, setRawDetail] = useState<OutboundHistoryDetail | null>(null);
  const [rawDetailError, setRawDetailError] = useState<string | null>(null);
  const [isRawDetailOpen, setIsRawDetailOpen] = useState(false);
  const [isLoadingRawDetail, setIsLoadingRawDetail] = useState(false);
  const [workspaceDefaults, setWorkspaceDefaults] = useState<MailSettingsWorkspaceDefaults | null>(null);
  const [outboundMaturity, setOutboundMaturity] = useState<OutboundMaturitySummary | null>(null);
  const [outboundMaturityError, setOutboundMaturityError] = useState<string | null>(null);
  const [isLoadingMaturity, setIsLoadingMaturity] = useState(false);
  const hasUserSelectedFilterRef = useRef(false);
  const activeMailboxId = activeMailbox?.id ?? null;
  const hasExplicitFilterParam = searchParams.has("view");

  const loadOutboundMaturity = useCallback(async () => {
    setIsLoadingMaturity(true);
    setOutboundMaturityError(null);
    try {
      const { maturity } = await fetchOutboundMaturity();
      setOutboundMaturity(maturity);
    } catch (error) {
      setOutboundMaturity(null);
      setOutboundMaturityError(error instanceof Error ? error.message : "发信成熟度检查加载失败");
    } finally {
      setIsLoadingMaturity(false);
    }
  }, []);

  useEffect(() => {
    void loadOutboundMaturity();
  }, [loadOutboundMaturity]);

  useEffect(() => {
    setFilter(getFilterFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let isStale = false;

    void fetchMailSettings()
      .then(({ settings }) => {
        if (isStale || !settings) return;
        setWorkspaceDefaults(settings.workspaceDefaults);
        if (!hasExplicitFilterParam && !hasUserSelectedFilterRef.current) {
          setFilter(getFilterFromSettings(settings.workspaceDefaults.outboundDefaultFilter));
        }
      })
      .catch(() => {
        if (!isStale) setWorkspaceDefaults(null);
      });

    return () => {
      isStale = true;
    };
  }, [hasExplicitFilterParam]);

  useEffect(() => {
    setPage(1);
    setSelectedRecordId(null);
  }, [filter, pageSize, searchValue]);

  useEffect(() => {
    if (!isMailboxSwitcherOpen) setMailboxSearchValue("");
  }, [isMailboxSwitcherOpen]);

  useEffect(() => {
    if (!activeMailboxId) return;
    void onRefreshOutbound({
      mailboxId: activeMailboxId,
      page,
      pageSize,
      status: toOutboundApiStatus(filter),
      ...(searchValue.trim() ? { search: searchValue.trim() } : {})
    });
  }, [activeMailboxId, filter, onRefreshOutbound, page, pageSize, searchValue]);

  const records = useMemo(() => buildOutboundRecords(outboundHistory), [outboundHistory]);
  const visibleMailboxes = useMemo(() => filterMailboxes(mailboxes, mailboxSearchValue), [mailboxSearchValue, mailboxes]);
  const visibleRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return records.filter((record) => {
      if (!matchFilter(record, filter)) return false;
      if (!normalizedSearch) return true;

      return [record.toAddress, record.subject, record.status, record.summary, record.failureReason ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [filter, records, searchValue]);

  const paged = useMemo(
    () => ({
      records: visibleRecords,
      safePage: outboundPage || page
    }),
    [outboundPage, page, visibleRecords]
  );
  const selectedRecord = useMemo(
    () => pickSelectedRecord(paged.records, selectedRecordId, Boolean(workspaceDefaults?.openLatestFailureFirst)),
    [paged.records, selectedRecordId, workspaceDefaults?.openLatestFailureFirst]
  );

  const sentCount = outboundSummary.sentCount ?? getFilterCount(records, "sent");
  const failedCount = outboundSummary.failedCount ?? getFilterCount(records, "failed");
  const totalCount = outboundSummary.totalCount ?? records.length;
  const successRate = totalCount ? `${Math.round((sentCount / totalCount) * 100)}%` : "0%";
  const hasSearch = searchValue.trim().length > 0;
  const emptyCopy = getEmptyCopy(filter, hasSearch);
  const activeMailboxName = activeMailbox?.label ?? "暂无可用发件身份";
  const activeMailboxAddress = activeMailbox?.address ?? "请先创建或启用一个邮箱账号";
  const hasMailboxOptions = mailboxes.length > 0;
  const outboundMaturityStatus = outboundMaturity ? getOutboundMaturityStatus(outboundMaturity) : "warning";
  const outboundQuotaRemaining = outboundMaturity ? getQuotaRemaining(outboundMaturity) : 0;

  function openBlankComposeDrawer() {
    setComposeDraft({});
    setIsComposeOpen(true);
  }

  function openRecordComposeDrawer(record: OutboundRecord) {
    setComposeDraft({
      toAddress: record.toAddress,
      subject: record.subject,
      bodyText: `请根据发件记录补发邮件。\n\n最近结果：${record.summary}`
    });
    setIsComposeOpen(true);
  }

  function openTemplateComposeDrawer(template: OutboundTemplateSummary) {
    setComposeDraft({
      subject: template.subject,
      bodyText: template.bodyText
    });
    setIsComposeOpen(true);
  }

  async function handleSendMail(event: FormEvent<HTMLFormElement>) {
    await onSendMail(event);
    setSearchValue("");
    void loadOutboundMaturity();
  }

  async function handleRefreshOutbound() {
    setIsRefreshing(true);
    try {
      await onRefreshOutbound(
        activeMailbox
          ? {
              mailboxId: activeMailbox.id,
              page,
              pageSize,
              status: toOutboundApiStatus(filter),
              ...(searchValue.trim() ? { search: searchValue.trim() } : {})
            }
          : null
      );
      await loadOutboundMaturity();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSwitchMailbox(mailboxId: string) {
    setPage(1);
    setSearchValue("");
    setSelectedRecordId(null);
    onSelectMailbox(mailboxId);
    setIsMailboxSwitcherOpen(false);
    if (mailboxId !== activeMailbox?.id) {
      await onRefreshOutbound({
        mailboxId,
        page: 1,
        pageSize,
        status: toOutboundApiStatus(filter),
        ...(searchValue.trim() ? { search: searchValue.trim() } : {})
      });
    }
  }

  async function handleCopyPayload(payload: string) {
    await navigator.clipboard?.writeText(payload);
  }

  async function handleOpenRawDetail(record: OutboundRecord) {
    setRawDetailError(null);
    setIsRawDetailOpen(true);
    setIsLoadingRawDetail(true);
    try {
      setRawDetail(await onLoadOutboundDetail(record.id));
    } catch (error) {
      setRawDetail(null);
      setRawDetailError(error instanceof Error ? error.message : "原始详情加载失败");
    } finally {
      setIsLoadingRawDetail(false);
    }
  }

  return (
    <>
      <Page as="main" className="workspace-grid outbound-page-grid">
        <section className="panel workspace-card outbound-toolbar-card">
          <PageHeader
            actions={
              <div className="workspace-topbar-actions outbound-toolbar-actions">
                <Button
                  disabled={!activeMailbox || isRefreshing}
                  leadingIcon={<RefreshCw size={16} strokeWidth={1.9} aria-hidden="true" />}
                  onClick={() => void handleRefreshOutbound()}
                  variant="secondary"
                >
                  {isRefreshing ? "刷新中" : "刷新"}
                </Button>
                <Button leadingIcon={<Send size={16} strokeWidth={1.9} aria-hidden="true" />} onClick={openBlankComposeDrawer} variant="primary">
                  新建发送
                </Button>
              </div>
            }
            className="outbound-page-header outbound-page-header-compact"
            kicker="邮件中心"
          >
            <h1 className="sr-only">发件箱</h1>
          </PageHeader>

          <div className="outbound-command-strip">
            <div className="outbound-mailbox-control">
              <Button
                aria-haspopup="dialog"
                aria-label={`切换发件身份，当前为 ${activeMailboxName} ${activeMailbox?.address ?? ""}`.trim()}
                className="outbound-mailbox-trigger"
                contentLayout="plain"
                disabled={!hasMailboxOptions}
                onClick={() => setIsMailboxSwitcherOpen(true)}
                variant="text"
              >
                <span className="outbound-mailbox-trigger-icon" aria-hidden="true">
                  <Send size={18} strokeWidth={1.9} />
                </span>
                <span className="outbound-mailbox-trigger-copy">
                  <strong>{activeMailboxName}</strong>
                  <small>{activeMailboxAddress}</small>
                </span>
                <ChevronDown className="outbound-mailbox-trigger-chevron" size={18} strokeWidth={1.9} aria-hidden="true" />
              </Button>
            </div>

            <div className="outbound-stat-grid" aria-label="发件箱概览">
              <StatCard detail="真实记录" icon={Inbox} label="发送总量" tone="neutral" value={totalCount} />
              <StatCard detail={`成功率 ${successRate}`} icon={CheckCircle2} label="发送成功" tone="success" value={sentCount} />
              <StatCard detail="可直接补发" icon={XCircle} label="发送失败" tone="danger" value={failedCount} />
            </div>
          </div>

          <section className="outbound-readiness-panel" aria-label="发信成熟度">
            <div className="outbound-readiness-header">
              <div>
                <p className="panel-kicker">发信成熟度</p>
                <h2>身份、DNS 与模板</h2>
              </div>
              <span className="outbound-readiness-status" data-status={outboundMaturityStatus}>
                {isLoadingMaturity ? "检查中" : getStatusLabel(outboundMaturityStatus)}
              </span>
            </div>

            {outboundMaturityError ? (
              <p className="error-banner" role="alert">
                {outboundMaturityError}
              </p>
            ) : outboundMaturity ? (
              <>
                <div className="outbound-readiness-grid">
                  <div className="outbound-readiness-metric">
                    <Gauge size={18} strokeWidth={1.9} aria-hidden="true" />
                    <p>今日额度</p>
                    <strong>
                      {outboundQuotaRemaining}/{outboundMaturity.quota.dailyLimit}
                    </strong>
                    <span>{outboundMaturity.quota.disabled ? "已停用" : `已用 ${outboundMaturity.quota.sendsToday}`}</span>
                  </div>
                  <div className="outbound-readiness-metric">
                    <Repeat2 size={18} strokeWidth={1.9} aria-hidden="true" />
                    <p>失败重试</p>
                    <strong>{outboundMaturity.retryPolicy.enabled ? outboundMaturity.retryPolicy.attempts : "未开启"}</strong>
                    <span>{outboundMaturity.retryPolicy.failureRetention}</span>
                  </div>
                  <div className="outbound-readiness-metric">
                    <ShieldCheck size={18} strokeWidth={1.9} aria-hidden="true" />
                    <p>Return-Path</p>
                    <strong>{getStatusLabel(outboundMaturity.returnPath.status)}</strong>
                    <span>{outboundMaturity.returnPath.message}</span>
                  </div>
                </div>

                <div className="outbound-readiness-columns">
                  <section className="outbound-check-list" aria-label="发信身份检查">
                    <div className="outbound-check-list-header">
                      <Send size={16} strokeWidth={1.9} aria-hidden="true" />
                      <strong>发信身份</strong>
                    </div>
                    {outboundMaturity.identities.slice(0, 3).map((identity) => (
                      <div className="outbound-check-row" data-status={identity.status} key={identity.id}>
                        <span>{identity.isDefault ? "默认" : identity.label}</span>
                        <small>{identity.address}</small>
                      </div>
                    ))}
                  </section>

                  <section className="outbound-check-list" aria-label="DNS 配置检查">
                    <div className="outbound-check-list-header">
                      <Network size={16} strokeWidth={1.9} aria-hidden="true" />
                      <strong>DNS 检查</strong>
                    </div>
                    {outboundMaturity.dnsChecks.map((check) => (
                      <div className="outbound-check-row" data-status={check.status} key={check.id}>
                        <span>{check.label}</span>
                        <small>{check.recordType} · {check.domain}</small>
                      </div>
                    ))}
                  </section>

                  <section className="outbound-check-list outbound-template-list" aria-label="发信模板">
                    <div className="outbound-check-list-header">
                      <FileText size={16} strokeWidth={1.9} aria-hidden="true" />
                      <strong>模板</strong>
                    </div>
                    {outboundMaturity.templates.map((template) => (
                      <Button
                        className="outbound-template-button"
                        contentLayout="plain"
                        key={template.id}
                        onClick={() => openTemplateComposeDrawer(template)}
                        variant="text"
                      >
                        <span>{template.name}</span>
                        <small>{template.description}</small>
                      </Button>
                    ))}
                  </section>
                </div>
              </>
            ) : (
              <div className="outbound-readiness-loading">
                <AlertTriangle size={17} strokeWidth={1.9} aria-hidden="true" />
                <span>{isLoadingMaturity ? "正在读取发信成熟度检查" : "暂无发信成熟度数据"}</span>
              </div>
            )}
          </section>

          <PageToolbar>
            <FilterBar className="outbound-toolbar-row" columns={2}>
              <FormField className="outbound-search-field" label={<span className="sr-only">发件箱搜索</span>}>
                <SearchInput
                  aria-label="发件箱搜索"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="搜索收件人 / 主题 / 发件结果"
                  value={searchValue}
                />
              </FormField>
              <Tabs
                className="outbound-status-tabs"
                onValueChange={(value) => {
                  hasUserSelectedFilterRef.current = true;
                  setFilter(value as OutboundFilter);
                }}
                value={filter}
                variant="segmented"
              >
                <TabsList aria-label="发件箱状态筛选" className="outbound-filter-row">
                  {outboundFilters.map(({ icon: Icon, label, value }) => (
                    <TabsTrigger key={value} value={value}>
                      <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                      <span>{label}</span>
                      <small aria-hidden="true">{getFilterCount(records, value)}</small>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </FilterBar>
          </PageToolbar>
        </section>

        <PageBody className="workspace-grid outbound-main-grid" hasSidebar>
          <PageMain aria-label="发件记录列表" className="panel workspace-card outbound-list-panel" role="region">
            <div className="workspace-card-header outbound-section-header">
              <div>
                <p className="panel-kicker">发送记录</p>
                <h2>最近外发</h2>
              </div>
              <span className="outbound-count-badge">{outboundTotal} 条</span>
            </div>

            <div className="outbound-record-list workspace-stack-compact">
              {outboundError ? (
                <p className="error-banner" role="alert">
                  {outboundError}
                </p>
              ) : null}
              {isLoadingOutbound && visibleRecords.length === 0 ? (
                <EmptyState
                  className="outbound-empty-card"
                  description="正在同步后端发件记录。"
                  icon={<RefreshCw size={26} strokeWidth={1.8} aria-hidden="true" />}
                  title="正在加载发件记录"
                />
              ) : null}
              {!isLoadingOutbound && visibleRecords.length === 0 ? (
                <EmptyState
                  className="outbound-empty-card"
                  description={emptyCopy.description}
                  icon={<SearchX size={26} strokeWidth={1.8} aria-hidden="true" />}
                  title={emptyCopy.title}
                />
              ) : null}
              {paged.records.map((record) => (
                <Button
                  key={record.id}
                  className="outbound-record-item"
                  contentLayout="plain"
                  data-active={record.id === selectedRecord?.id ? "true" : "false"}
                  isActive={record.id === selectedRecord?.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  variant="text"
                >
                  <div className="outbound-record-item-top">
                    <strong title={record.subject}>{record.subject}</strong>
                    <span className="outbound-status-chip" data-status={record.status}>
                      {record.status}
                    </span>
                  </div>
                  <div className="outbound-record-item-meta">
                    <span title={record.toAddress}>{record.toAddress}</span>
                    <small>{record.createdAtLabel}</small>
                  </div>
                  <p>{record.summary}</p>
                </Button>
              ))}
            </div>

            {outboundTotal > pageSize ? (
              <Pagination
                aria-label="发件记录分页"
                className="outbound-pagination users-list-pagination"
                onChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedRecordId(null);
                }}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setSelectedRecordId(null);
                }}
                page={paged.safePage}
                pageSize={pageSize}
                pageSizeOptions={outboundPageSizeOptions}
                total={outboundTotal}
              />
            ) : null}
          </PageMain>

          <PageSidebar aria-label="发件记录详情" className="panel workspace-card outbound-detail-panel" role="region">
            {selectedRecord ? (
              <>
                <div className="workspace-card-header outbound-section-header">
                  <div>
                    <p className="panel-kicker">记录详情</p>
                    <h2>{selectedRecord.subject}</h2>
                  </div>
                  <span className="outbound-status-chip" data-status={selectedRecord.status}>
                    {selectedRecord.status}
                  </span>
                </div>

                <dl className="outbound-detail-grid">
                  <div>
                    <dt>收件人</dt>
                    <dd>{selectedRecord.toAddress}</dd>
                  </div>
                  <div>
                    <dt>发件身份</dt>
                    <dd>{activeMailbox?.address ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>结果</dt>
                    <dd>{selectedRecord.failureReason ?? "已发送"}</dd>
                  </div>
                  <div>
                    <dt>时间</dt>
                    <dd>{selectedRecord.createdAtLabel}</dd>
                  </div>
                </dl>

                <section className="outbound-result-card" aria-label="发送结果摘要">
                  <p className="panel-kicker">发送结果</p>
                  <strong>{selectedRecord.summary}</strong>
                  <span>{selectedRecord.failureReason ? "可从当前详情补发并保留原始 payload。" : "邮件已进入发送记录，可复制 payload 做审计留存。"}</span>
                </section>

                <div className="outbound-detail-payload">
                  <p className="panel-kicker">Payload 预览</p>
                  <pre>{selectedRecord.payloadPreview}</pre>
                </div>

                <div className="outbound-detail-actions">
                  <Button leadingIcon={<Repeat2 size={16} strokeWidth={1.9} aria-hidden="true" />} onClick={() => openRecordComposeDrawer(selectedRecord)} variant="primary">
                    重发
                  </Button>
                  <Button leadingIcon={<ClipboardCopy size={16} strokeWidth={1.9} aria-hidden="true" />} onClick={() => void handleCopyPayload(selectedRecord.payloadPreview)} variant="secondary">
                    复制 payload
                  </Button>
                  <Button leadingIcon={<FileJson size={16} strokeWidth={1.9} aria-hidden="true" />} onClick={() => void handleOpenRawDetail(selectedRecord)} variant="ghost">
                    查看原始详情
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                className="outbound-empty-card outbound-detail-empty-card"
                description="从左侧选择一条发送记录后，这里会显示收件人、发送结果、payload 和补发动作。"
                icon={<Inbox size={28} strokeWidth={1.8} aria-hidden="true" />}
                title="请选择一条发件记录"
              />
            )}
          </PageSidebar>
        </PageBody>
      </Page>

      <OutboundComposeDrawer
        draft={composeDraft}
        hasActiveMailbox={Boolean(activeMailbox)}
        onClose={() => setIsComposeOpen(false)}
        onSendMail={handleSendMail}
        open={isComposeOpen}
      />

      {isMailboxSwitcherOpen ? (
        <OverlayDialog
          className="outbound-mailbox-dialog"
          closeLabel="关闭发件身份切换"
          description="选择后会同步刷新发件记录和新建发送使用的发件邮箱。"
          onClose={() => setIsMailboxSwitcherOpen(false)}
          size="md"
          title="切换发件身份"
        >
          <div className="outbound-mailbox-dialog-body">
            <FormField className="outbound-mailbox-search" label={<span className="sr-only">搜索发件身份</span>}>
              <SearchInput
                autoFocus
                aria-label="搜索发件身份"
                onChange={(event) => setMailboxSearchValue(event.target.value)}
                placeholder="搜索邮箱名或邮箱账号"
                value={mailboxSearchValue}
              />
            </FormField>

            <div className="outbound-mailbox-options" role="list">
              {visibleMailboxes.map((mailbox) => {
                const isSelected = mailbox.id === activeMailbox?.id;

                return (
                  <Button
                    aria-label={`${mailbox.label} ${mailbox.address}`}
                    className="outbound-mailbox-option"
                    contentLayout="plain"
                    data-selected={isSelected ? "true" : "false"}
                    isActive={isSelected}
                    key={mailbox.id}
                    onClick={() => void handleSwitchMailbox(mailbox.id)}
                    variant="text"
                  >
                    <span className="outbound-mailbox-option-icon" aria-hidden="true">
                      <Send size={17} strokeWidth={1.9} />
                    </span>
                    <span className="outbound-mailbox-option-copy">
                      <strong title={mailbox.label}>{mailbox.label}</strong>
                      <small title={mailbox.address}>{mailbox.address}</small>
                    </span>
                    {isSelected ? (
                      <span className="outbound-mailbox-option-check">
                        <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                        已选
                      </span>
                    ) : null}
                  </Button>
                );
              })}

              {visibleMailboxes.length === 0 ? (
                <EmptyState
                  className="outbound-empty-card outbound-mailbox-empty-card"
                  description="换一个邮箱标签或地址关键词再试一次。"
                  icon={<SearchX size={24} strokeWidth={1.8} aria-hidden="true" />}
                  title="没有匹配的发件身份"
                />
              ) : null}
            </div>
          </div>
        </OverlayDialog>
      ) : null}

      {isRawDetailOpen ? (
        <OverlayDialog
          className="outbound-raw-dialog"
          closeLabel="关闭原始发件详情"
          description="展示后端保存的发件请求、provider 响应和正文信息。"
          onClose={() => {
            setIsRawDetailOpen(false);
            setRawDetail(null);
            setRawDetailError(null);
          }}
          size="lg"
          title="原始发件详情"
        >
          {isLoadingRawDetail ? (
            <EmptyState
              className="outbound-empty-card"
              description="正在读取持久化的原始请求和响应。"
              icon={<RefreshCw size={24} strokeWidth={1.8} aria-hidden="true" />}
              title="正在加载原始详情"
            />
          ) : rawDetailError ? (
            <p className="error-banner" role="alert">
              {rawDetailError}
            </p>
          ) : rawDetail ? (
            <div className="outbound-raw-detail">
              <dl className="outbound-detail-grid">
                <div>
                  <dt>发件身份</dt>
                  <dd>{rawDetail.fromAddress}</dd>
                </div>
                <div>
                  <dt>收件人</dt>
                  <dd>{rawDetail.toAddress}</dd>
                </div>
                <div>
                  <dt>Provider ID</dt>
                  <dd>{rawDetail.providerMessageId ?? "-"}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>{rawDetail.status === "failed" ? "失败" : "已发送"}</dd>
                </div>
              </dl>
              <div className="outbound-detail-payload">
                <p className="panel-kicker">正文</p>
                <pre>{rawDetail.bodyText}</pre>
              </div>
              <div className="outbound-detail-payload">
                <p className="panel-kicker">请求 payload</p>
                <pre>{rawDetail.requestPayloadJson}</pre>
              </div>
              <div className="outbound-detail-payload">
                <p className="panel-kicker">Provider 响应</p>
                <pre>{rawDetail.responsePayloadJson ?? "{}"}</pre>
              </div>
            </div>
          ) : null}
        </OverlayDialog>
      ) : null}
    </>
  );
}
