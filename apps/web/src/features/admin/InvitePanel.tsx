import { useEffect, useState } from "react";

import { Button } from "../../shared/button";
import { Badge } from "../../shared/badge";
import { FormField, SelectInput } from "../../shared/form";
import { Pagination } from "../../shared/pagination";
import { formatInviteStatus } from "./formatters";
import type { InviteCreatePayload, InviteStatus, InviteSummary } from "./types";

type InvitePanelProps = {
  adminInvites: InviteSummary[];
  invitesAvailable?: number;
  invitesPage?: number;
  invitesPageSize?: number;
  invitesTotal?: number;
  onCreateInvite: (payload: InviteCreatePayload) => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
  onInvitePageChange?: (page: number) => Promise<void>;
};

const INVITE_PAGE_SIZE = 5;

function getInviteStatus(invite: InviteSummary): InviteStatus {
  if (invite.status) return invite.status;
  if (invite.redeemedAt) return "redeemed";
  if (invite.disabledAt) return "disabled";
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) return "expired";
  return "ready";
}

function getInviteBadgeVariant(status: InviteStatus) {
  if (status === "ready") return "success";
  if (status === "redeemed") return "info";
  return "warning";
}

function getRoleLabel(role: InviteSummary["targetRole"]) {
  return role === "admin" ? "管理员" : "成员";
}

function formatInviteExpiry(invite: InviteSummary) {
  if (!invite.expiresAt) return "长期有效";
  return `有效期至 ${invite.expiresAt.slice(0, 10)}`;
}

export function InvitePanel({
  adminInvites,
  invitesAvailable,
  invitesPage,
  invitesPageSize,
  invitesTotal,
  onCreateInvite,
  onDisableInvite,
  onInvitePageChange
}: InvitePanelProps) {
  const [localPage, setLocalPage] = useState(1);
  const [targetRole, setTargetRole] = useState<InviteCreatePayload["targetRole"]>("member");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [count, setCount] = useState("1");
  const isRemotePaged = Boolean(onInvitePageChange);
  const pageSize = invitesPageSize ?? INVITE_PAGE_SIZE;
  const total = invitesTotal ?? adminInvites.length;
  const availableInvites = invitesAvailable ?? adminInvites.filter((invite) => getInviteStatus(invite) === "ready").length;
  const currentPage = invitesPage ?? localPage;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const visibleInvites = isRemotePaged ? adminInvites : adminInvites.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (!isRemotePaged && localPage > pageCount) {
      setLocalPage(pageCount);
    }
  }, [isRemotePaged, localPage, pageCount]);

  function handlePageChange(page: number) {
    if (onInvitePageChange) {
      void onInvitePageChange(page);
      return;
    }
    setLocalPage(page);
  }

  function handleCreateInvite() {
    void onCreateInvite({
      count: Number(count),
      targetRole,
      expiresInDays: expiresInDays === "never" ? null : Number(expiresInDays)
    });
  }

  return (
    <section className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">邀请流程</p>
          <h2>邀请与入场</h2>
          <p className="section-copy">创建、停用并查看邀请码状态，无需离开当前控制台。</p>
        </div>
        <div className="users-invite-create-controls">
          <FormField className="users-invite-create-field" label="角色">
            <SelectInput
              aria-label="邀请码目标角色"
              onChange={(event) => setTargetRole(event.currentTarget.value as InviteCreatePayload["targetRole"])}
              value={targetRole}
            >
              <option value="member">成员</option>
              <option value="admin">管理员</option>
            </SelectInput>
          </FormField>
          <FormField className="users-invite-create-field" label="有效期">
            <SelectInput
              aria-label="邀请码有效期"
              onChange={(event) => setExpiresInDays(event.currentTarget.value)}
              value={expiresInDays}
            >
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="90">90 天</option>
              <option value="never">长期</option>
            </SelectInput>
          </FormField>
          <FormField className="users-invite-create-field" label="数量">
            <SelectInput
              aria-label="邀请码创建数量"
              onChange={(event) => setCount(event.currentTarget.value)}
              value={count}
            >
              <option value="1">1 个</option>
              <option value="5">5 个</option>
              <option value="10">10 个</option>
              <option value="20">20 个</option>
            </SelectInput>
          </FormField>
          <Button onClick={handleCreateInvite} size="sm" variant="primary">
            创建邀请码
          </Button>
        </div>
      </div>
      <div className="users-settings-section-meta">
        <span>可用 {availableInvites}</span>
        <span>总计 {total}</span>
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
                <span>
                  创建于 {invite.createdAt.slice(0, 10)} · {getRoleLabel(invite.targetRole)} · {formatInviteExpiry(invite)}
                </span>
                {invite.redeemedByUserId ? <span>兑换用户 {invite.redeemedByUserId}</span> : null}
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
        {total === 0 ? <p className="empty-state">当前没有可用邀请码，创建一个以邀请新成员。</p> : null}
      </div>
      {total > pageSize ? (
        <Pagination
          aria-label="邀请码分页"
          className="users-settings-pagination"
          onChange={handlePageChange}
          page={safePage}
          pageSize={pageSize}
          siblings={0}
          total={total}
        />
      ) : null}
    </section>
  );
}
