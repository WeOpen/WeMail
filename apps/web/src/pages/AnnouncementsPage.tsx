import { lazy, Suspense, type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

import {
  acknowledgeAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  type AnnouncementCreatePayload,
  type AnnouncementItem,
  type AnnouncementSummaryItem,
  type AnnouncementUpdatePayload,
  updateAnnouncement
} from "../features/announcements/api";
import { Button } from "../shared/button";
import { nivoTheme } from "../shared/chart";
import { Checkbox, FormField, SelectInput, TextareaInput, TextInput } from "../shared/form";
import { OverlayDialog } from "../shared/overlay";
import { Pagination } from "../shared/pagination";
import { Skeleton } from "../shared/skeleton";
import { ViewportDeferred } from "../shared/ViewportDeferred";

type AnnouncementsPageProps = {
  canPublish?: boolean;
};

type AnnouncementFormState = {
  audience: string;
  endAt: string;
  pinned: boolean;
  priority: string;
  startAt: string;
  status: string;
  summary: string;
  tags: string;
  title: string;
  type: string;
};

type AnnouncementDialogMode = "create" | "edit" | "view";

const ANNOUNCEMENTS_PAGE_SIZE = 4;
const ANNOUNCEMENTS_PAGE_SIZE_OPTIONS = [4, 10, 20] as const;
const PINNED_CAROUSEL_INTERVAL_MS = 5000;
const ResponsivePieChart = lazy(() => import("@nivo/pie").then((module) => ({ default: module.ResponsivePie })));

const announcementFilters = {
  type: [
    { label: "全部类型", value: "all" },
    { label: "产品更新", value: "产品更新" },
    { label: "维护通知", value: "维护通知" },
    { label: "运营通知", value: "运营通知" },
    { label: "安全提醒", value: "安全提醒" }
  ],
  status: [
    { label: "全部状态", value: "all" },
    { label: "已发布", value: "已发布" },
    { label: "进行中", value: "进行中" },
    { label: "即将开始", value: "即将开始" },
    { label: "已结束", value: "已结束" },
    { label: "已归档", value: "已归档" }
  ],
  time: [
    { label: "全部时间", value: "all" },
    { label: "近 7 天", value: "7d" },
    { label: "近 30 天", value: "30d" }
  ]
};

const statusToneMap: Record<string, string> = {
  "已发布": "#1f7a38",
  "进行中": "#ff7a00",
  "即将开始": "#ffb866",
  "已结束": "#111827",
  "已归档": "#8a94a6"
};

const announcementStatusLabels = announcementFilters.status
  .filter((option) => option.value !== "all")
  .map((option) => option.label);
const announcementStatusLabelSet = new Set(announcementStatusLabels);

function AnnouncementsChartSkeleton() {
  return <Skeleton animated className="announcements-chart-skeleton" rounded="full" />;
}

const emptyFormState: AnnouncementFormState = {
  audience: "全部成员",
  endAt: "",
  pinned: false,
  priority: "中",
  startAt: "",
  status: "已发布",
  summary: "",
  tags: "",
  title: "",
  type: "产品更新"
};

function typeClassName(type: string) {
  switch (type) {
    case "维护通知":
      return "maintenance";
    case "产品更新":
      return "product";
    case "运营通知":
      return "operations";
    case "安全提醒":
      return "security";
    default:
      return "default";
  }
}

function statusClassName(status: string) {
  switch (status) {
    case "进行中":
      return "live";
    case "即将开始":
      return "soon";
    case "已结束":
      return "ended";
    case "已归档":
      return "archived";
    case "已发布":
      return "published";
    default:
      return "default";
  }
}

function receiptClassName(status: string | undefined) {
  return status === "已签收" ? "signed" : "unsigned";
}

function formatAnnouncementTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function parseTags(value: string) {
  return value
    .split(/[,\n，、/]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildStatusSummary(announcements: AnnouncementItem[]) {
  const summary = new Map<string, number>();
  announcements.forEach((announcement) => {
    summary.set(announcement.status, (summary.get(announcement.status) ?? 0) + 1);
  });

  return buildStatusSummaryFromPayload(
    announcementStatusLabels.map((label) => ({
      label,
      value: summary.get(label) ?? 0
    }))
  );
}

function buildStatusSummaryFromPayload(summary: AnnouncementSummaryItem[]) {
  const summaryByLabel = new Map(summary.map((item) => [item.label, item.value]));
  const normalizedSummary = announcementStatusLabels.map((label) => ({
    label,
    value: summaryByLabel.get(label) ?? 0
  }));
  summary.forEach((item) => {
    if (!announcementStatusLabelSet.has(item.label)) normalizedSummary.push(item);
  });

  return normalizedSummary.map((item) => ({
    id: item.label,
    label: item.label,
    value: item.value,
    color: statusToneMap[item.label] ?? "#8a94a6"
  }));
}

function compareAnnouncements(left: AnnouncementItem, right: AnnouncementItem) {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
  return right.publishedAt.localeCompare(left.publishedAt);
}

function formStateFromAnnouncement(announcement: AnnouncementItem): AnnouncementFormState {
  return {
    audience: announcement.audience,
    endAt: toDateTimeLocalValue(announcement.endAt),
    pinned: announcement.pinned,
    priority: announcement.priority,
    startAt: toDateTimeLocalValue(announcement.startAt),
    status: announcement.status,
    summary: announcement.summary,
    tags: announcement.tags.join(","),
    title: announcement.title,
    type: announcement.type
  };
}

function buildFormPayload(formState: AnnouncementFormState): AnnouncementCreatePayload {
  return {
    title: formState.title.trim(),
    summary: formState.summary.trim(),
    type: formState.type,
    status: formState.status,
    audience: formState.audience,
    priority: formState.priority,
    tags: parseTags(formState.tags),
    pinned: formState.pinned,
    startAt: formState.startAt || null,
    endAt: formState.endAt || null
  };
}

export function AnnouncementsPage({ canPublish = false }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [featuredAnnouncements, setFeaturedAnnouncements] = useState<AnnouncementItem[]>([]);
  const [statusSummary, setStatusSummary] = useState<AnnouncementSummaryItem[]>([]);
  const [activePinnedIndex, setActivePinnedIndex] = useState(0);
  const [formState, setFormState] = useState<AnnouncementFormState>(emptyFormState);
  const [dialogMode, setDialogMode] = useState<AnnouncementDialogMode | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ANNOUNCEMENTS_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAnnouncements = useCallback(() => {
    setRefreshKey((currentKey) => currentKey + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    void fetchAnnouncements({
      page,
      pageSize,
      q: searchTerm.trim() || undefined,
      scope: canPublish ? "manage" : undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      time: timeFilter === "all" ? undefined : (timeFilter as "7d" | "30d"),
      type: typeFilter === "all" ? undefined : typeFilter
    })
      .then((payload) => {
        if (cancelled) return;
        const nextAnnouncements = payload.announcements ?? [];
        setAnnouncements(nextAnnouncements);
        setFeaturedAnnouncements(payload.featuredAnnouncements ?? nextAnnouncements.filter((announcement) => announcement.pinned));
        setStatusSummary(payload.summary ?? buildStatusSummary(nextAnnouncements));
        setTotal(payload.total ?? payload.announcements?.length ?? 0);
      })
      .catch((error) => {
        if (cancelled) return;
        setAnnouncements([]);
        setFeaturedAnnouncements([]);
        setStatusSummary([]);
        setTotal(0);
        setLoadError(error instanceof Error ? error.message : "公告加载失败");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canPublish, page, pageSize, refreshKey, searchTerm, statusFilter, timeFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, timeFilter, typeFilter]);

  const filteredAnnouncements = useMemo(() => [...announcements].sort(compareAnnouncements), [announcements]);
  const pinnedAnnouncements = useMemo(
    () => (featuredAnnouncements.length > 0 ? featuredAnnouncements : announcements.filter((announcement) => announcement.pinned)),
    [announcements, featuredAnnouncements]
  );
  const activeFeaturedAnnouncement = pinnedAnnouncements[activePinnedIndex] ?? pinnedAnnouncements[0] ?? announcements[0] ?? null;
  const overviewData = useMemo(() => buildStatusSummaryFromPayload(statusSummary), [statusSummary]);
  const overviewChartData = useMemo(() => overviewData.filter((item) => item.value > 0), [overviewData]);

  useEffect(() => {
    setActivePinnedIndex(0);
  }, [pinnedAnnouncements.length]);

  useEffect(() => {
    if (pinnedAnnouncements.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActivePinnedIndex((currentIndex) => (currentIndex + 1) % pinnedAnnouncements.length);
    }, PINNED_CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [pinnedAnnouncements.length]);

  function openPublishDialog() {
    setFormState(emptyFormState);
    setSelectedAnnouncement(null);
    setFormError(null);
    setDialogMode("create");
  }

  function openEditDialog(announcement: AnnouncementItem) {
    setSelectedAnnouncement(announcement);
    setFormState(formStateFromAnnouncement(announcement));
    setFormError(null);
    setActionError(null);
    setDialogMode("edit");
  }

  function openViewDialog(announcement: AnnouncementItem) {
    setSelectedAnnouncement(announcement);
    setActionError(null);
    setDialogMode("view");
    if (announcement.receiptStatus === "已签收") return;
    void acknowledgeAnnouncement(announcement.id)
      .then((result) => {
        if (!result.announcement) return;
        replaceAnnouncement(result.announcement);
      })
      .catch((error) => {
        setActionError(error instanceof Error ? error.message : "公告签收失败，请稍后重试。");
      });
  }

  function closeAnnouncementDialog() {
    if (isSubmitting) return;
    setDialogMode(null);
    setSelectedAnnouncement(null);
    setFormError(null);
  }

  function updateFormField<Key extends keyof AnnouncementFormState>(key: Key, value: AnnouncementFormState[Key]) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value
    }));
  }

  function replaceAnnouncement(nextAnnouncement: AnnouncementItem) {
    setAnnouncements((currentAnnouncements) =>
      currentAnnouncements.map((announcement) => (announcement.id === nextAnnouncement.id ? nextAnnouncement : announcement))
    );
  }

  async function handleSaveAnnouncement() {
    const title = formState.title.trim();
    const summary = formState.summary.trim();
    if (!title || !summary) {
      setFormError("请填写公告标题和公告内容。");
      return;
    }

    const payload = buildFormPayload(formState);

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (dialogMode === "edit" && selectedAnnouncement) {
        const result = await updateAnnouncement(selectedAnnouncement.id, payload satisfies AnnouncementUpdatePayload);
        replaceAnnouncement(result.announcement);
      } else {
        await createAnnouncement(payload);
        if (page !== 1) setPage(1);
        setActivePinnedIndex(0);
      }
      refreshAnnouncements();
      setDialogMode(null);
      setSelectedAnnouncement(null);
      setFormError(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "公告保存失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchiveAnnouncement(announcement: AnnouncementItem) {
    setActionError(null);
    try {
      const result = await updateAnnouncement(announcement.id, { status: "已归档" });
      replaceAnnouncement(result.announcement);
      refreshAnnouncements();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "公告归档失败，请稍后重试。");
    }
  }

  async function handleDeleteAnnouncement() {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await deleteAnnouncement(deleteTarget.id);
      refreshAnnouncements();
      setDeleteTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "公告删除失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  return (
    <main className="workspace-grid announcements-grid">
      <div className="announcements-top-grid">
        <section className="panel workspace-card announcements-hero-card">
          {activeFeaturedAnnouncement ? (
            <>
              <div
                className="announcements-hero-copy"
                data-carousel-index={activePinnedIndex}
                key={activeFeaturedAnnouncement.id}
              >
                <p className="panel-kicker">置顶公告</p>
                <h1>{activeFeaturedAnnouncement.title}</h1>
                <p className="section-copy announcements-hero-description">{activeFeaturedAnnouncement.summary}</p>
                <div className="announcements-chip-row announcements-hero-chip-row">
                  <span className={`announcements-chip ${typeClassName(activeFeaturedAnnouncement.type)}`}>
                    {activeFeaturedAnnouncement.type}
                  </span>
                  <span className={`announcements-chip ${statusClassName(activeFeaturedAnnouncement.status)}`}>
                    {activeFeaturedAnnouncement.status}
                  </span>
                  <span className="announcements-chip neutral">发布者：{activeFeaturedAnnouncement.author}</span>
                  <span className="announcements-chip neutral">
                    发布时间：{formatAnnouncementTime(activeFeaturedAnnouncement.publishedAt)}
                  </span>
                </div>
              </div>
              {pinnedAnnouncements.length > 1 ? (
                <div
                  aria-label="置顶公告轮播"
                  className="announcements-carousel-rail"
                  role="tablist"
                  style={
                    {
                      "--announcements-carousel-duration": `${PINNED_CAROUSEL_INTERVAL_MS}ms`
                    } as CSSProperties
                  }
                >
                  {pinnedAnnouncements.map((announcement, index) => (
                    <button
                      aria-label={announcement.title}
                      aria-selected={index === activePinnedIndex}
                      className="announcements-carousel-step"
                      data-state={index === activePinnedIndex ? "active" : "idle"}
                      key={announcement.id}
                      onClick={() => setActivePinnedIndex(index)}
                      role="tab"
                      type="button"
                    >
                      <span aria-hidden="true" className="announcements-carousel-step-track">
                        <span className="announcements-carousel-step-fill" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="announcements-empty-card announcements-empty-hero">
              <Megaphone absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.8} />
              <h1>暂无公告</h1>
              <p className="section-copy">当前没有可展示的系统公告。</p>
            </div>
          )}
        </section>

        <section className="panel workspace-card announcements-overview-panel" aria-label="公告概览">
          <p className="panel-kicker announcements-section-kicker">概览</p>
          <div className="announcements-overview-layout">
            <div className="announcements-overview-visual">
              <div
                aria-label="公告状态分布图"
                className="announcements-overview-donut announcements-overview-donut-combined"
                role="img"
              >
                {overviewChartData.length > 0 ? (
                  <ViewportDeferred fallback={<AnnouncementsChartSkeleton />}>
                    <Suspense fallback={<AnnouncementsChartSkeleton />}>
                      <ResponsivePieChart
                        activeOuterRadiusOffset={4}
                        animate={false}
                        borderWidth={0}
                        colors={{ datum: "data.color" }}
                        cornerRadius={4}
                        data={overviewChartData}
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
                <div className="announcements-overview-donut-center">
                  <strong>{total}</strong>
                  <span>总公告</span>
                </div>
              </div>
            </div>

            <div className="announcements-overview-legend">
              {overviewData.length > 0 ? (
                overviewData.map((item) => (
                  <article className="announcements-overview-row" key={item.label}>
                    <div className="announcements-overview-row-head">
                      <span className="announcements-list-label">
                        <i className="dashboard-dot" style={{ backgroundColor: item.color }} />
                        <h3>{item.label}</h3>
                      </span>
                      <strong>{item.value} 条</strong>
                    </div>
                  </article>
                ))
              ) : (
                <article className="announcements-overview-row">
                  <div className="announcements-overview-row-head">
                    <span className="announcements-list-label">
                      <i className="dashboard-dot" />
                      <h3>暂无数据</h3>
                    </span>
                    <strong>0 条</strong>
                  </div>
                </article>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="announcements-main-grid announcements-main-grid-single">
        <section className="panel workspace-card announcements-panel">
          <div className="announcements-section-head">
            <p className="panel-kicker announcements-section-kicker">最近公告</p>
            {canPublish ? (
              <Button
                className="announcements-publish-button"
                leadingIcon={
                  <Plus
                    absoluteStrokeWidth
                    aria-hidden="true"
                    className="announcements-publish-icon workspace-icon"
                    strokeWidth={2}
                  />
                }
                onClick={openPublishDialog}
                variant="primary"
              >
                发布公告
              </Button>
            ) : null}
          </div>

          <div className="announcements-control-bar announcements-control-bar-inline" aria-label="最近公告筛选">
            <FormField className="announcements-search-field" label={<span className="sr-only">公告搜索</span>}>
              <TextInput
                aria-label="公告搜索"
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                placeholder="搜索标题 / 内容 / 标签"
                type="search"
                value={searchTerm}
              />
            </FormField>

            <FormField className="announcements-filter-field" label={<span className="sr-only">按类型筛选公告</span>}>
              <SelectInput aria-label="按类型筛选公告" onChange={(event) => setTypeFilter(event.currentTarget.value)} value={typeFilter}>
                {announcementFilters.type.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField className="announcements-filter-field" label={<span className="sr-only">按状态筛选公告</span>}>
              <SelectInput
                aria-label="按状态筛选公告"
                onChange={(event) => setStatusFilter(event.currentTarget.value)}
                value={statusFilter}
              >
                {announcementFilters.status.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField className="announcements-filter-field" label={<span className="sr-only">按时间筛选公告</span>}>
              <SelectInput aria-label="按时间筛选公告" onChange={(event) => setTimeFilter(event.currentTarget.value)} value={timeFilter}>
                {announcementFilters.time.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          {loadError ? (
            <p aria-label="公告加载失败" className="error-banner" role="alert">
              {loadError}
            </p>
          ) : null}
          {actionError ? (
            <p aria-label="公告操作失败" className="error-banner" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="announcements-timeline">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <article aria-hidden="true" className="announcements-item announcements-item-skeleton" key={index} />
              ))
            ) : filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((announcement) => (
                <article className="announcements-item" key={announcement.id}>
                  <button
                    aria-label={`查看公告 ${announcement.title}`}
                    className="announcements-item-open"
                    onClick={() => openViewDialog(announcement)}
                    type="button"
                  >
                    <div className="announcements-item-head">
                      <div className="announcements-item-title">
                        <div className="announcements-chip-row">
                          {announcement.pinned ? <span className="announcements-chip pinned">已置顶</span> : null}
                          <span className={`announcements-chip ${typeClassName(announcement.type)}`}>{announcement.type}</span>
                          <span className={`announcements-chip ${statusClassName(announcement.status)}`}>{announcement.status}</span>
                          <span className={`announcements-chip ${receiptClassName(announcement.receiptStatus)}`}>
                            {announcement.receiptStatus ?? "未签收"}
                          </span>
                        </div>
                        <h3>{announcement.title}</h3>
                      </div>
                      <span className="announcements-item-time">{formatAnnouncementTime(announcement.publishedAt)}</span>
                    </div>

                    <p className="section-copy announcements-item-summary">{announcement.summary}</p>

                    <div className="announcements-item-footer">
                      <span>范围：{announcement.audience}</span>
                      <span>优先级：{announcement.priority}</span>
                      <span>标签：{announcement.tags.length > 0 ? announcement.tags.join(" / ") : "-"}</span>
                      <span>更新：{formatAnnouncementTime(announcement.updatedAt)}</span>
                      <span>起始：{formatAnnouncementTime(announcement.startAt)}</span>
                      <span>结束：{formatAnnouncementTime(announcement.endAt)}</span>
                      {canPublish && announcement.receiptSummary ? (
                        <span>
                          已签收 {announcement.receiptSummary.signed} / 未签收 {announcement.receiptSummary.unsigned}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  {canPublish ? (
                    <div className="announcements-item-actions">
                      <Button
                        aria-label={`修改 ${announcement.title}`}
                        leadingIcon={<Pencil absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />}
                        onClick={() => openEditDialog(announcement)}
                        size="sm"
                        variant="secondary"
                      >
                        修改
                      </Button>
                      <Button
                        aria-label={`归档 ${announcement.title}`}
                        leadingIcon={<Archive absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />}
                        onClick={() => void handleArchiveAnnouncement(announcement)}
                        size="sm"
                        variant="secondary"
                      >
                        归档
                      </Button>
                      <Button
                        aria-label={`删除 ${announcement.title}`}
                        leadingIcon={<Trash2 absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />}
                        onClick={() => setDeleteTarget(announcement)}
                        size="sm"
                        variant="danger"
                      >
                        删除
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="announcements-empty-card">
                <Megaphone absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.8} />
                <h3>暂无公告</h3>
                <p className="section-copy">当前筛选条件下没有公告。</p>
              </div>
            )}
          </div>

          {total > 0 ? (
            <Pagination
              aria-label="公告列表分页"
              className="users-list-pagination announcements-pagination"
              onChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={ANNOUNCEMENTS_PAGE_SIZE_OPTIONS}
              total={total}
            />
          ) : null}
        </section>
      </div>

      {dialogMode === "create" || dialogMode === "edit" ? (
        <OverlayDialog
          closeLabel={dialogMode === "edit" ? "关闭修改公告" : "关闭发布公告"}
          className="announcements-publish-dialog"
          eyebrow="公告"
          onClose={closeAnnouncementDialog}
          title={dialogMode === "edit" ? "修改公告" : "发布公告"}
        >
          <>
            <FormField label="公告标题" required>
              <TextInput
                aria-label="公告标题"
                onChange={(event) => updateFormField("title", event.currentTarget.value)}
                placeholder="例如：核心平台升级窗口"
                required
                type="text"
                value={formState.title}
              />
            </FormField>
            <FormField label="公告内容" required>
              <TextareaInput
                aria-label="公告内容"
                onChange={(event) => updateFormField("summary", event.currentTarget.value)}
                placeholder="说明变更内容、影响范围和用户需要关注的事项"
                required
                rows={5}
                value={formState.summary}
              />
            </FormField>
            <div className="announcements-dialog-grid">
              <FormField label="公告类型">
                <SelectInput aria-label="公告类型" onChange={(event) => updateFormField("type", event.currentTarget.value)} value={formState.type}>
                  {announcementFilters.type
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </SelectInput>
              </FormField>
              <FormField label="发布状态">
                <SelectInput
                  aria-label="发布状态"
                  onChange={(event) => updateFormField("status", event.currentTarget.value)}
                  value={formState.status}
                >
                  {announcementFilters.status
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </SelectInput>
              </FormField>
              <FormField label="可见范围">
                <SelectInput
                  aria-label="可见范围"
                  onChange={(event) => updateFormField("audience", event.currentTarget.value)}
                  value={formState.audience}
                >
                  <option value="全部成员">全部成员</option>
                  <option value="管理员">管理员</option>
                  <option value="普通成员">普通成员</option>
                </SelectInput>
              </FormField>
              <FormField label="优先级">
                <SelectInput
                  aria-label="优先级"
                  onChange={(event) => updateFormField("priority", event.currentTarget.value)}
                  value={formState.priority}
                >
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </SelectInput>
              </FormField>
              <FormField label="起始时间">
                <TextInput
                  aria-label="起始时间"
                  onChange={(event) => updateFormField("startAt", event.currentTarget.value)}
                  type="datetime-local"
                  value={formState.startAt}
                />
              </FormField>
              <FormField label="结束时间">
                <TextInput
                  aria-label="结束时间"
                  onChange={(event) => updateFormField("endAt", event.currentTarget.value)}
                  type="datetime-local"
                  value={formState.endAt}
                />
              </FormField>
            </div>
            <FormField label="公告标签">
              <TextInput
                aria-label="公告标签"
                onChange={(event) => updateFormField("tags", event.currentTarget.value)}
                placeholder="多个标签用逗号分隔"
                type="text"
                value={formState.tags}
              />
            </FormField>
            <Checkbox
              checked={formState.pinned}
              label="置顶公告"
              onChange={(event) => updateFormField("pinned", event.currentTarget.checked)}
            />
            {formError ? (
              <p className="form-message" data-tone="error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button onClick={closeAnnouncementDialog} variant="secondary">
                取消
              </Button>
              <Button
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingLabel={dialogMode === "edit" ? "保存中" : "发布中"}
                onClick={() => void handleSaveAnnouncement()}
                variant="primary"
              >
                {dialogMode === "edit" ? "保存修改" : "确认发布"}
              </Button>
            </div>
          </>
        </OverlayDialog>
      ) : null}
      {dialogMode === "view" && selectedAnnouncement ? (
        <OverlayDialog
          closeLabel="关闭查看公告"
          className="announcements-view-dialog"
          eyebrow="公告详情"
          onClose={closeAnnouncementDialog}
          title="查看公告"
        >
          <div className="announcements-view-body">
            <div className="announcements-chip-row">
              {selectedAnnouncement.pinned ? <span className="announcements-chip pinned">已置顶</span> : null}
              <span className={`announcements-chip ${typeClassName(selectedAnnouncement.type)}`}>{selectedAnnouncement.type}</span>
              <span className={`announcements-chip ${statusClassName(selectedAnnouncement.status)}`}>{selectedAnnouncement.status}</span>
              <span className={`announcements-chip ${receiptClassName(selectedAnnouncement.receiptStatus)}`}>
                {selectedAnnouncement.receiptStatus ?? "未签收"}
              </span>
            </div>
            <div className="announcements-view-title">
              <h3>{selectedAnnouncement.title}</h3>
              <p className="section-copy">{selectedAnnouncement.summary}</p>
            </div>
            <dl className="announcements-view-meta">
              <div>
                <dt>发布者</dt>
                <dd>{selectedAnnouncement.author}</dd>
              </div>
              <div>
                <dt>发布时间</dt>
                <dd>{formatAnnouncementTime(selectedAnnouncement.publishedAt)}</dd>
              </div>
              <div>
                <dt>起始时间</dt>
                <dd>{formatAnnouncementTime(selectedAnnouncement.startAt)}</dd>
              </div>
              <div>
                <dt>结束时间</dt>
                <dd>{formatAnnouncementTime(selectedAnnouncement.endAt)}</dd>
              </div>
              <div>
                <dt>可见范围</dt>
                <dd>{selectedAnnouncement.audience}</dd>
              </div>
              <div>
                <dt>优先级</dt>
                <dd>{selectedAnnouncement.priority}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{selectedAnnouncement.tags.length > 0 ? selectedAnnouncement.tags.join(" / ") : "-"}</dd>
              </div>
              {canPublish && selectedAnnouncement.receiptSummary ? (
                <div>
                  <dt>签收统计</dt>
                  <dd>
                    已签收 {selectedAnnouncement.receiptSummary.signed} / 未签收 {selectedAnnouncement.receiptSummary.unsigned}
                  </dd>
                </div>
              ) : null}
            </dl>
            {actionError ? (
              <p className="form-message" data-tone="error" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button onClick={closeAnnouncementDialog} variant="primary">
                关闭
              </Button>
            </div>
          </div>
        </OverlayDialog>
      ) : null}
      {deleteTarget ? (
        <OverlayDialog
          closeLabel="关闭删除公告"
          className="announcements-delete-dialog"
          eyebrow="危险操作"
          onClose={() => {
            if (!isSubmitting) setDeleteTarget(null);
          }}
          title="删除公告"
        >
          <div className="announcements-delete-body">
            <p className="section-copy">删除后公告将不再展示，相关签收记录也会一并移除。</p>
            <strong>{deleteTarget.title}</strong>
            {actionError ? (
              <p className="form-message" data-tone="error" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button disabled={isSubmitting} onClick={() => setDeleteTarget(null)} variant="secondary">
                取消
              </Button>
              <Button
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingLabel="删除中"
                onClick={() => void handleDeleteAnnouncement()}
                variant="danger"
              >
                确认删除
              </Button>
            </div>
          </div>
        </OverlayDialog>
      ) : null}
    </main>
  );
}
