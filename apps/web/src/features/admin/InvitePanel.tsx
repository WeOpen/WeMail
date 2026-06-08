import { useEffect, useState } from "react";

import { Button } from "../../shared/button";
import { Badge } from "../../shared/badge";
import { Pagination } from "../../shared/pagination";
import { formatInviteStatus } from "./formatters";
import type { InviteStatus, InviteSummary } from "./types";

type InvitePanelProps = {
  adminInvites: InviteSummary[];
  onCreateInvite: () => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
};

const INVITE_PAGE_SIZE = 5;

function getInviteStatus(invite: InviteSummary): InviteStatus {
  if (invite.status) return invite.status;
  if (invite.redeemedAt) return "redeemed";
  if (invite.disabledAt) return "disabled";
  return "ready";
}

function getInviteBadgeVariant(status: InviteStatus) {
  if (status === "ready") return "success";
  if (status === "redeemed") return "info";
  return "warning";
}

export function InvitePanel({ adminInvites, onCreateInvite, onDisableInvite }: InvitePanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const availableInvites = adminInvites.filter((invite) => getInviteStatus(invite) === "ready").length;
  const pageCount = Math.max(1, Math.ceil(adminInvites.length / INVITE_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const visibleInvites = adminInvites.slice((safePage - 1) * INVITE_PAGE_SIZE, safePage * INVITE_PAGE_SIZE);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  return (
    <section className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">邀请流程</p>
          <h2>邀请与入场</h2>
          <p className="section-copy">创建、停用并查看邀请码状态，无需离开当前控制台。</p>
        </div>
        <Button onClick={() => void onCreateInvite()} size="sm" variant="primary">
          创建邀请码
        </Button>
      </div>
      <div className="users-settings-section-meta">
        <span>可用 {availableInvites}</span>
        <span>总计 {adminInvites.length}</span>
      </div>
      <div className="stack-list workspace-stack-list users-settings-list" role="list">
        {visibleInvites.map((invite) => {
          const status = getInviteStatus(invite);
          const statusLabel = formatInviteStatus(invite);
          const isReady = status === "ready";

          return (
            <div key={invite.id} className="stack-item admin-stack-item users-settings-row" role="listitem">
              <div className="users-settings-row-main">
                <strong>{invite.code}</strong>
                <span>创建于 {invite.createdAt.slice(0, 10)}</span>
              </div>
              <div className="users-settings-row-actions">
                <Badge className="users-invite-status-badge" variant={getInviteBadgeVariant(status)}>
                  {statusLabel}
                </Badge>
                <Button
                  aria-label={isReady ? `停用邀请码 ${invite.code}` : `${statusLabel}邀请码 ${invite.code}`}
                  disabled={!isReady}
                  onClick={() => void onDisableInvite(invite.id)}
                  size="sm"
                  variant="secondary"
                >
                  {isReady ? "停用" : "不可停用"}
                </Button>
              </div>
            </div>
          );
        })}
        {adminInvites.length === 0 ? <p className="empty-state">当前没有可用邀请码，创建一个以邀请新成员。</p> : null}
      </div>
      {adminInvites.length > INVITE_PAGE_SIZE ? (
        <Pagination
          aria-label="邀请码分页"
          className="users-settings-pagination"
          onChange={setCurrentPage}
          page={safePage}
          pageSize={INVITE_PAGE_SIZE}
          siblings={0}
          total={adminInvites.length}
        />
      ) : null}
    </section>
  );
}
