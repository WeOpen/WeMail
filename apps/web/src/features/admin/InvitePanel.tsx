import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import type { UserSummary } from "@wemail/shared";

import { Button } from "../../shared/button";
import { Badge } from "../../shared/badge";
import { formatDisplayEmail } from "../../shared/display";
import { FormField, SelectInput } from "../../shared/form";
import { OverlayDialog } from "../../shared/overlay";
import { Pagination } from "../../shared/pagination";
import { formatInviteStatus } from "./formatters";
import type { InviteCreatePayload, InviteStatus, InviteSummary } from "./types";

type InvitePanelProps = {
  adminInvites: InviteSummary[];
  invitesAvailable?: number;
  invitesPage?: number;
  invitesPageSize?: number;
  invitesTotal?: number;
  users?: UserSummary[];
  onCreateInvite: (payload: InviteCreatePayload) => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
  onInvitePageChange?: (page: number) => Promise<void>;
  onInvitePageSizeChange?: (pageSize: number) => Promise<void>;
};

const INVITE_PAGE_SIZE = 5;
const INVITE_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

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

function formatUserDisplayName(user: UserSummary) {
  return user.name.trim() || formatDisplayEmail(user.email);
}

function resolveRedeemedByLabel(invite: InviteSummary, users: UserSummary[]) {
  if (!invite.redeemedByUserId) return null;
  const apiDisplayName = invite.redeemedByUserName?.trim();
  if (apiDisplayName) return apiDisplayName;
  const matchedUser = users.find((user) => user.id === invite.redeemedByUserId);
  return matchedUser ? formatUserDisplayName(matchedUser) : "未知用户";
}

export function InvitePanel({
  adminInvites,
  invitesAvailable,
  invitesPage,
  invitesPageSize,
  invitesTotal,
  users = [],
  onCreateInvite,
  onDisableInvite,
  onInvitePageChange,
  onInvitePageSizeChange
}: InvitePanelProps) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(INVITE_PAGE_SIZE);
  const [targetRole, setTargetRole] = useState<InviteCreatePayload["targetRole"]>("member");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [count, setCount] = useState("1");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const isRemotePaged = Boolean(onInvitePageChange);
  const pageSize = invitesPageSize ?? localPageSize;
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

  function handlePageSizeChange(nextPageSize: number) {
    if (onInvitePageSizeChange) {
      void onInvitePageSizeChange(nextPageSize);
      return;
    }
    setLocalPageSize(nextPageSize);
    setLocalPage(1);
  }

  async function handleCreateInvite() {
    await onCreateInvite({
      count: Number(count),
      targetRole,
      expiresInDays: expiresInDays === "never" ? null : Number(expiresInDays)
    });
    setIsCreateDialogOpen(false);
  }

  return (
    <section aria-label="邀请流程" className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">邀请流程</p>
        </div>
        <div className="users-invite-create-controls">
          <Button
            leadingIcon={<Plus size={16} strokeWidth={2.1} />}
            onClick={() => setIsCreateDialogOpen(true)}
            size="md"
            variant="primary"
          >
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
          const redeemedByLabel = resolveRedeemedByLabel(invite, users);

          return (
            <div key={invite.id} className="stack-item admin-stack-item users-settings-row" role="listitem">
              <div className="users-settings-row-main">
                <strong>{invite.code}</strong>
                <span>
                  创建于 {invite.createdAt.slice(0, 10)} · {getRoleLabel(invite.targetRole)} · {formatInviteExpiry(invite)}
                </span>
                {redeemedByLabel ? <span>兑换用户 {redeemedByLabel}</span> : null}
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
      <Pagination
        aria-label="邀请码分页"
        className="users-list-pagination"
        onChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        page={safePage}
        pageSize={pageSize}
        pageSizeOptions={INVITE_PAGE_SIZE_OPTIONS}
        total={total}
      />
      {isCreateDialogOpen ? (
        <OverlayDialog
          closeLabel="关闭创建邀请码"
          eyebrow="邀请流程"
          onClose={() => setIsCreateDialogOpen(false)}
          size="sm"
          title="创建邀请码"
        >
          <form
            className="users-invite-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateInvite();
            }}
          >
            <FormField label="角色">
              <SelectInput
                aria-label="邀请码目标角色"
                onChange={(event) => setTargetRole(event.currentTarget.value as InviteCreatePayload["targetRole"])}
                value={targetRole}
              >
                <option value="member">成员</option>
                <option value="admin">管理员</option>
              </SelectInput>
            </FormField>
            <FormField label="有效期">
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
            <FormField label="数量">
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
            <div className="workspace-dialog-actions">
              <Button onClick={() => setIsCreateDialogOpen(false)} variant="secondary">
                取消
              </Button>
              <Button leadingIcon={<Plus size={16} strokeWidth={2.1} />} type="submit" variant="primary">
                创建邀请码
              </Button>
            </div>
          </form>
        </OverlayDialog>
      ) : null}
    </section>
  );
}
