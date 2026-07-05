import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";
import { Badge } from "../../shared/badge";
import { Button } from "../../shared/button";
import { formatDisplayEmail } from "../../shared/display";
import { CheckboxField, FormField, TextInput } from "../../shared/form";
import { Pagination } from "../../shared/pagination";
import { Tag } from "../../shared/tag";

type QuotaPanelProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  quotaUsersPage?: number;
  quotaUsersPageSize?: number;
  quotaUsersTotal?: number;
  onQuotaUsersPageChange?: (page: number) => Promise<void>;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

const QUOTA_USERS_PAGE_SIZE = 5;

function getRoleLabel(user: UserSummary) {
  return user.role === "admin" ? "管理员" : "成员";
}

function getUserDisplayName(user: UserSummary) {
  return user.name || formatDisplayEmail(user.email);
}

function getStatusLabel(user: UserSummary) {
  return user.status === "disabled" ? "停用" : "正常";
}

function getStatusVariant(user: UserSummary) {
  return user.status === "disabled" ? "warning" : "success";
}

export function QuotaPanel({
  adminUsers,
  adminQuota,
  quotaUsersPage,
  quotaUsersPageSize,
  quotaUsersTotal,
  onQuotaUsersPageChange,
  onSelectQuotaUser,
  onSubmitQuota
}: QuotaPanelProps) {
  const [localPage, setLocalPage] = useState(1);
  const isRemotePaged = Boolean(onQuotaUsersPageChange);
  const pageSize = quotaUsersPageSize ?? QUOTA_USERS_PAGE_SIZE;
  const total = quotaUsersTotal ?? adminUsers.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(quotaUsersPage ?? localPage, pageCount);
  const visibleUsers = isRemotePaged ? adminUsers : adminUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedQuotaUser = adminQuota
    ? adminUsers.find((user) => user.id === adminQuota.userId) ?? null
    : null;

  useEffect(() => {
    if (!isRemotePaged && localPage > pageCount) {
      setLocalPage(pageCount);
    }
  }, [isRemotePaged, localPage, pageCount]);

  function handleQuotaUsersPageChange(page: number) {
    if (onQuotaUsersPageChange) {
      void onQuotaUsersPageChange(page);
      return;
    }
    setLocalPage(page);
  }

  return (
    <section aria-label="配额限制" className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">配额限制</p>
        </div>
        <div className="users-settings-section-meta compact">
          <span>{total} 个用户</span>
        </div>
      </div>

      <div className="users-quota-layout">
        <section aria-label="配额用户" className="users-quota-users-column">
          <div className="stack-list workspace-stack-list workspace-stack-compact users-quota-user-list">
            {visibleUsers.map((user) => {
              const displayEmail = formatDisplayEmail(user.email);

              return (
                <Button
                  aria-label={`选择配额用户 ${user.name || user.email} ${user.email} ${getRoleLabel(user)}`}
                  className="stack-item selectable admin-stack-item users-settings-row users-quota-user-row"
                  contentLayout="plain"
                  isActive={adminQuota?.userId === user.id}
                  key={user.id}
                  onClick={() => void onSelectQuotaUser(user.id)}
                  variant="text"
                >
                  <div className="users-settings-row-main">
                    <strong title={user.name ? undefined : user.email}>{getUserDisplayName(user)}</strong>
                    <span className="truncated-email" title={user.email}>{displayEmail}</span>
                  </div>
                  <div className="users-settings-row-actions">
                    <Tag variant={user.role === "admin" ? "brand" : "neutral"}>{getRoleLabel(user)}</Tag>
                    <Badge variant={getStatusVariant(user)}>{getStatusLabel(user)}</Badge>
                  </div>
                </Button>
              );
            })}
            {total === 0 ? <p className="empty-state">当前还没有可配置配额的用户。</p> : null}
          </div>
          {total > pageSize ? (
            <Pagination
              aria-label="配额用户分页"
              className="users-list-pagination users-quota-pagination"
              onChange={handleQuotaUsersPageChange}
              page={currentPage}
              pageSize={pageSize}
              siblings={0}
              total={total}
            />
          ) : null}
        </section>

        <div className="users-quota-target-column">
          {adminQuota ? (
            <>
              <section aria-label="当前配额目标" className="users-quota-current">
                <div className="users-quota-current-copy">
                  <span>当前配额目标</span>
                  <strong>{selectedQuotaUser ? getUserDisplayName(selectedQuotaUser) : adminQuota.userId}</strong>
                  {selectedQuotaUser ? (
                    <small className="truncated-email" title={selectedQuotaUser.email}>
                      {formatDisplayEmail(selectedQuotaUser.email)}
                    </small>
                  ) : (
                    <small>用户 ID：{adminQuota.userId}</small>
                  )}
                </div>
                <div className="users-quota-meter">
                  <span>外发</span>
                  <strong>{adminQuota.sendsToday} / {adminQuota.dailyLimit}</strong>
                  <span>API</span>
                  <strong>{adminQuota.apiCallsToday} / {adminQuota.apiDailyLimit}</strong>
                  <Badge variant={adminQuota.disabled ? "warning" : "success"}>
                    {adminQuota.disabled ? "已暂停" : "可外发"}
                  </Badge>
                </div>
              </section>
              <form
                aria-label="保存用户配额"
                className="composer-form users-quota-form"
                key={adminQuota.userId}
                onSubmit={(event) => void onSubmitQuota(event, adminQuota.userId)}
              >
                <div className="users-quota-limit-grid">
                  <FormField description={`今日已发送 ${adminQuota.sendsToday} 封`} label="每日发送上限">
                    <TextInput defaultValue={adminQuota.dailyLimit} name="dailyLimit" type="number" />
                  </FormField>
                  <FormField description={`今日已调用 ${adminQuota.apiCallsToday} 次`} label="API 每日调用上限">
                    <TextInput defaultValue={adminQuota.apiDailyLimit} name="apiDailyLimit" type="number" />
                  </FormField>
                </div>
                <div className="users-quota-form-footer">
                  <CheckboxField defaultChecked={adminQuota.disabled} label="暂停该用户的外发能力" name="disabled" />
                  <Button leadingIcon={<Save size={15} strokeWidth={2.1} />} size="sm" type="submit" variant="primary">
                    保存配额
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <p className="empty-state">请选择一个用户查看配额状态。</p>
          )}
        </div>
      </div>
    </section>
  );
}
