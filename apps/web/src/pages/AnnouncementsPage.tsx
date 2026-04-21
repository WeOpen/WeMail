import { useMemo } from "react";
import { ResponsivePie } from "@nivo/pie";

import {
  announcementFilters,
  announcementsTimeline,
  announcementStatusSummary,
  featuredAnnouncement,
  type AnnouncementItem
} from "../features/announcements/announcementsMockData";
import { Button } from "../shared/button";
import { nivoTheme } from "../shared/chart";
import { FormField, SelectInput, TextInput } from "../shared/form";

type AnnouncementsPageProps = {
  canPublish?: boolean;
};

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
  const overviewData = useMemo(
    () =>
      announcementStatusSummary.map((item) => ({
        id: item.label,
        label: item.label,
        value: item.ratio,
        color: item.tone
      })),
    []
  );

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
              >
                <ResponsivePie
                  activeOuterRadiusOffset={4}
                  animate={false}
                  borderWidth={0}
                  colors={{ datum: "data.color" }}
                  cornerRadius={4}
                  data={overviewData}
                  enableArcLabels={false}
                  enableArcLinkLabels={false}
                  innerRadius={0.62}
                  margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  padAngle={1.5}
                  theme={nivoTheme}
                  valueFormat={(value) => `${value}%`}
                />
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
              <Button className="announcements-publish-button" variant="primary">
                发布公告
              </Button>
            ) : null}
          </div>

          <div className="announcements-control-bar announcements-control-bar-inline" aria-label="最近公告筛选">
            <FormField className="announcements-search-field" label={<span className="sr-only">公告搜索</span>}>
              <TextInput aria-label="公告搜索" placeholder="搜索标题 / 内容 / 标签" readOnly type="search" />
            </FormField>

            <FormField className="announcements-filter-field" label={<span className="sr-only">按类型筛选公告</span>}>
              <SelectInput aria-label="按类型筛选公告" defaultValue="all">
                {announcementFilters.type.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField className="announcements-filter-field" label={<span className="sr-only">按状态筛选公告</span>}>
              <SelectInput aria-label="按状态筛选公告" defaultValue="all">
                {announcementFilters.status.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField className="announcements-filter-field" label={<span className="sr-only">按时间筛选公告</span>}>
              <SelectInput aria-label="按时间筛选公告" defaultValue="all">
                {announcementFilters.time.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
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
