import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { OutboundHistoryItem } from "../inbox/types";
import { buildOutboundRecords, type OutboundRecord } from "./outboundMockData";

type OutboundFilter = "all" | "sent" | "failed" | "exceptions";

type OutboundPageProps = {
  outboundHistory: OutboundHistoryItem[];
};

const FILTER_LABELS: Record<OutboundFilter, string> = {
  all: "全部",
  sent: "已发送",
  failed: "失败",
  exceptions: "异常 / 无匹配"
};

function getFilterFromSearchParams(searchParams: URLSearchParams): OutboundFilter {
  return searchParams.get("view") === "exceptions" ? "exceptions" : "all";
}

function matchFilter(record: OutboundRecord, filter: OutboundFilter) {
  if (filter === "sent") return record.status === "已发送";
  if (filter === "failed") return record.status === "失败";
  if (filter === "exceptions") return record.status === "异常 / 无匹配";
  return true;
}

function pickSelectedRecord(records: OutboundRecord[], filter: OutboundFilter, selectedRecordId: string | null) {
  if (selectedRecordId) {
    const exact = records.find((record) => record.id === selectedRecordId);
    if (exact) return exact;
  }

  if (filter === "exceptions") {
    return records[0] ?? null;
  }

  return records.find((record) => record.source === "history") ?? records[0] ?? null;
}

export function OutboundPage({ outboundHistory }: OutboundPageProps) {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutboundFilter>(() => getFilterFromSearchParams(searchParams));

  useEffect(() => {
    setFilter(getFilterFromSearchParams(searchParams));
  }, [searchParams]);

  const records = useMemo(() => buildOutboundRecords(outboundHistory), [outboundHistory]);
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

  const selectedRecord = useMemo(
    () => pickSelectedRecord(visibleRecords, filter, selectedRecordId),
    [filter, selectedRecordId, visibleRecords]
  );

  return (
    <main className="workspace-grid outbound-page-grid">
      <section className="panel workspace-card outbound-toolbar-card">
        <div className="workspace-card-header outbound-toolbar-header">
          <div>
            <p className="panel-kicker">邮件中心</p>
            <h1>发件箱</h1>
            <p className="section-copy">按发送结果回看历史、定位失败原因，并把异常 / 无匹配记录和正常外发放在同一套工作流里。</p>
          </div>
          <div className="workspace-topbar-actions outbound-toolbar-actions">
            <button className="workspace-action-button secondary" type="button">
              刷新
            </button>
            <button className="workspace-action-button primary" type="button">
              新建发送
            </button>
          </div>
        </div>

        <div className="outbound-toolbar-row">
          <label className="outbound-search-field">
            <span className="sr-only">发件箱搜索</span>
            <input
              aria-label="发件箱搜索"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="搜索收件人 / 主题 / 发件结果"
              type="search"
              value={searchValue}
            />
          </label>
          <div aria-label="发件箱状态筛选" className="outbound-filter-row" role="toolbar">
            {(Object.keys(FILTER_LABELS) as OutboundFilter[]).map((filterKey) => (
              <button
                key={filterKey}
                aria-pressed={filter === filterKey}
                className="workspace-action-button ghost"
                data-active={filter === filterKey ? "true" : "false"}
                onClick={() => setFilter(filterKey)}
                type="button"
              >
                {FILTER_LABELS[filterKey]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="workspace-grid outbound-main-grid">
        <section aria-label="发件记录列表" className="panel workspace-card outbound-list-panel" role="region">
          <div className="workspace-card-header outbound-section-header">
            <div>
              <p className="panel-kicker">发送记录</p>
              <h2>最近外发与异常</h2>
            </div>
            <span className="outbound-count-badge">{visibleRecords.length} 条</span>
          </div>

          <div className="outbound-record-list workspace-stack-compact">
            {visibleRecords.length === 0 ? (
              <p className="empty-state">当前筛选条件下还没有匹配的发件记录。</p>
            ) : null}
            {visibleRecords.map((record) => (
              <button
                key={record.id}
                className="outbound-record-item"
                data-active={record.id === selectedRecord?.id ? "true" : "false"}
                onClick={() => setSelectedRecordId(record.id)}
                type="button"
              >
                <div className="outbound-record-item-top">
                  <strong>{record.toAddress}</strong>
                  <small>{record.createdAtLabel}</small>
                </div>
                <div className="outbound-record-item-meta">
                  <span className="outbound-status-chip" data-status={record.status}>
                    {record.status}
                  </span>
                  <span>{record.subject}</span>
                </div>
                <p>{record.summary}</p>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="发件记录详情" className="panel workspace-card outbound-detail-panel" role="region">
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
                  <dt>结果</dt>
                  <dd>{selectedRecord.failureReason ?? "已发送"}</dd>
                </div>
                <div>
                  <dt>摘要</dt>
                  <dd>{selectedRecord.summary}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>{selectedRecord.createdAtLabel}</dd>
                </div>
              </dl>

              <div className="outbound-detail-payload">
                <p className="panel-kicker">Payload 预览</p>
                <pre>{selectedRecord.payloadPreview}</pre>
              </div>

              <div className="outbound-detail-actions">
                <button className="workspace-action-button primary" type="button">
                  重发
                </button>
                <button className="workspace-action-button secondary" type="button">
                  复制 payload
                </button>
                <button className="workspace-action-button ghost" type="button">
                  查看原始详情
                </button>
              </div>
            </>
          ) : (
            <p className="empty-state">当前还没有发件记录。</p>
          )}
        </section>
      </div>
    </main>
  );
}
