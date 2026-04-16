import {
  announcementFilters,
  announcementsTimeline,
  announcementStatusSummary,
  featuredAnnouncement,
  type AnnouncementItem
} from "../features/announcements/announcementsMockData";

type AnnouncementsPageProps = {
  canPublish?: boolean;
};

function buildOverviewDonut() {
  let offset = 0;
  const segments = announcementStatusSummary.map((item) => {
    const next = offset + item.ratio;
    const segment = `${item.tone} ${offset}% ${next}%`;
    offset = next;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function typeClassName(type: AnnouncementItem["type"]) {
  switch (type) {
    case "维护通知":
      return "maintenance";
    case "产品更新":
      return "product";
    case "运营通知":
      return "operations";
    default:
      return "default";
  }
}

function statusClassName(status: AnnouncementItem["status"]) {
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

export function AnnouncementsPage({ canPublish = false }: AnnouncementsPageProps) {
  return (
    <main className="workspace-grid announcements-grid">
      <div className="announcements-top-grid">
        <section className="panel workspace-card announcements-hero-card">
          <div className="announcements-hero-copy">
            <p className="panel-kicker">置顶公告</p>
            <h1>{featuredAnnouncement.title}</h1>
            <p className="section-copy announcements-hero-description">{featuredAnnouncement.summary}</p>
            <div className="announcements-chip-row">
              <span className={`announcements-chip ${typeClassName(featuredAnnouncement.type)}`}>{featuredAnnouncement.type}</span>
              <span className={`announcements-chip ${statusClassName(featuredAnnouncement.status)}`}>{featuredAnnouncement.status}</span>
              <span className="announcements-chip neutral">发布者：{featuredAnnouncement.author}</span>
              <span className="announcements-chip neutral">发布时间：{featuredAnnouncement.publishedAt}</span>
            </div>
          </div>
        </section>

        <section className="panel workspace-card announcements-overview-panel" aria-label="公告概览">
          <p className="panel-kicker announcements-section-kicker">概览</p>
          <div className="announcements-overview-layout">
            <div className="announcements-overview-visual">
              <div
                aria-label="公告状态分布图"
                className="announcements-overview-donut announcements-overview-donut-combined"
                role="img"
                style={{ backgroundImage: buildOverviewDonut() }}
              >
                <div className="announcements-overview-donut-center">
                  <strong>40</strong>
                  <span>总公告</span>
                </div>
              </div>
            </div>

            <div className="announcements-overview-legend">
              {announcementStatusSummary.map((item) => (
                <article className="announcements-overview-row" key={item.label}>
                  <div className="announcements-overview-row-head">
                    <span className="announcements-list-label">
                      <i className="dashboard-dot" style={{ backgroundColor: item.tone }} />
                      <h3>{item.label}</h3>
                    </span>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="announcements-main-grid announcements-main-grid-single">
        <section className="panel workspace-card announcements-panel">
          <div className="announcements-section-head">
            <p className="panel-kicker announcements-section-kicker">最近公告</p>
            {canPublish ? (
              <button className="workspace-action-button secondary announcements-publish-button" type="button">
                发布公告
              </button>
            ) : null}
          </div>

          <div className="announcements-control-bar announcements-control-bar-inline" aria-label="最近公告筛选">
            <label className="announcements-search-field">
              <span className="sr-only">公告搜索</span>
              <input aria-label="公告搜索" placeholder="搜索标题 / 内容 / 标签" readOnly type="search" />
            </label>

            <label className="announcements-filter-field">
              <span className="sr-only">按类型筛选公告</span>
              <select aria-label="按类型筛选公告" defaultValue="all">
                {announcementFilters.type.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="announcements-filter-field">
              <span className="sr-only">按状态筛选公告</span>
              <select aria-label="按状态筛选公告" defaultValue="all">
                {announcementFilters.status.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="announcements-filter-field">
              <span className="sr-only">按时间筛选公告</span>
              <select aria-label="按时间筛选公告" defaultValue="all">
                {announcementFilters.time.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="announcements-timeline">
            {announcementsTimeline.map((announcement) => (
              <article className="announcements-item" key={announcement.id}>
                <div className="announcements-item-head">
                  <div className="announcements-item-title">
                    <div className="announcements-chip-row">
                      <span className={`announcements-chip ${typeClassName(announcement.type)}`}>{announcement.type}</span>
                      <span className={`announcements-chip ${statusClassName(announcement.status)}`}>{announcement.status}</span>
                    </div>
                    <h3>{announcement.title}</h3>
                  </div>
                  <span className="announcements-item-time">{announcement.publishedAt}</span>
                </div>

                <p className="section-copy announcements-item-summary">{announcement.summary}</p>

                <div className="announcements-item-footer">
                  <span>范围：{announcement.audience}</span>
                  <span>优先级：{announcement.priority}</span>
                  <span>标签：{announcement.tags.join(" / ")}</span>
                  <span>更新：{announcement.updatedAt}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
