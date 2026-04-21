import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "../../shared/button";
import { FormField, TextInput } from "../../shared/form";
import type { OutboundHistoryItem } from "../inbox/types";
import { buildOutboundRecords, type OutboundRecord } from "./outboundMockData";
import { OutboundComposeDrawer } from "./OutboundComposeDrawer";

type OutboundFilter = "all" | "sent" | "failed" | "exceptions";

type OutboundPageProps = {
  outboundHistory: OutboundHistoryItem[];
  hasActiveMailbox: boolean;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
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

export function OutboundPage({ outboundHistory, hasActiveMailbox, onSendMail }: OutboundPageProps) {
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutboundFilter>(() => getFilterFromSearchParams(searchParams));
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<{ toAddress?: string; subject?: string; bodyText?: string }>({});

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

  const detailActions =
    selectedRecord?.source === "exception"
      ? [
          "检查目标地址是否已经绑定到现有邮箱。",
          "确认当前路由规则是否覆盖该发送场景。",
          "如仍需补发，先复制异常 payload，再从抽屉里按原目标地址重发。"
        ]
      : null;

  function openBlankComposeDrawer() {
    setComposeDraft({});
    setIsComposeOpen(true);
  }

  function openRecordComposeDrawer(record: OutboundRecord) {
    setComposeDraft({
      toAddress: record.toAddress,
      subject: record.subject,
      bodyText:
        record.source === "exception"
          ? `请根据异常记录补发邮件。\n\n异常摘要：${record.summary}\n失败原因：${record.failureReason ?? "未提供"}`
          : `请根据发件记录补发邮件。\n\n最近结果：${record.summary}`
    });
    setIsComposeOpen(true);
  }

  async function handleSendMail(event: FormEvent<HTMLFormElement>) {
    await onSendMail(event);
    setSearchValue("");
  }

  async function handleCopyPayload(payload: string) {
    await navigator.clipboard?.writeText(payload);
  }

  return (
    <>
      <main className="workspace-grid outbound-page-grid">
        <section className="panel workspace-card outbound-toolbar-card">
          <div className="workspace-card-header outbound-toolbar-header">
            <div>
              <p className="panel-kicker">邮件中心</p>
              <h1>发件箱</h1>
              <p className="section-copy">按发送结果回看历史、定位失败原因，并把异常 / 无匹配记录和正常外发放在同一套工作流里。</p>
            </div>
            <div className="workspace-topbar-actions outbound-toolbar-actions">
              <Button variant="secondary">刷新</Button>
              <Button onClick={openBlankComposeDrawer} variant="primary">
                新建发送
              </Button>
            </div>
          </div>

          <div className="outbound-toolbar-row">
            <FormField className="outbound-search-field" label={<span className="sr-only">发件箱搜索</span>}>
              <TextInput
                aria-label="发件箱搜索"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="搜索收件人 / 主题 / 发件结果"
                type="search"
                value={searchValue}
              />
            </FormField>
            <div aria-label="发件箱状态筛选" className="outbound-filter-row" role="toolbar">
              {(Object.keys(FILTER_LABELS) as OutboundFilter[]).map((filterKey) => (
                <Button
                  aria-pressed={filter === filterKey}
                  isActive={filter === filterKey}
                  key={filterKey}
                  onClick={() => setFilter(filterKey)}
                  variant="ghost"
                >
                  {FILTER_LABELS[filterKey]}
                </Button>
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
              {visibleRecords.length === 0 ? <p className="empty-state">当前筛选条件下还没有匹配的发件记录。</p> : null}
              {visibleRecords.map((record) => (
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
                </Button>
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

                {detailActions ? (
                  <section aria-label="异常处理建议" className="outbound-exception-guidance">
                    <div className="outbound-exception-guidance-header">
                      <p className="panel-kicker">异常排查</p>
                      <h3>处理建议</h3>
                    </div>
                    <p className="outbound-exception-guidance-copy">这条记录没有命中既有邮箱或路由策略，建议先按下面顺序处理，再决定是否直接补发。</p>
                    <ol>
                      {detailActions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                <div className="outbound-detail-payload">
                  <p className="panel-kicker">Payload 预览</p>
                  <pre>{selectedRecord.payloadPreview}</pre>
                </div>

                <div className="outbound-detail-actions">
                  {selectedRecord.source === "exception" ? (
                    <Button onClick={() => openRecordComposeDrawer(selectedRecord)} variant="primary">
                      按当前异常信息补发
                    </Button>
                  ) : (
                    <Button onClick={() => openRecordComposeDrawer(selectedRecord)} variant="primary">
                      重发
                    </Button>
                  )}
                  <Button onClick={() => void handleCopyPayload(selectedRecord.payloadPreview)} variant="secondary">
                    {selectedRecord.source === "exception" ? "复制异常 payload" : "复制 payload"}
                  </Button>
                  <Button variant="ghost">
                    {selectedRecord.source === "exception" ? "查看原始异常详情" : "查看原始详情"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="empty-state">当前还没有发件记录。</p>
            )}
          </section>
        </div>
      </main>

      <OutboundComposeDrawer
        draft={composeDraft}
        hasActiveMailbox={hasActiveMailbox}
        onClose={() => setIsComposeOpen(false)}
        onSendMail={handleSendMail}
        open={isComposeOpen}
      />
    </>
  );
}
