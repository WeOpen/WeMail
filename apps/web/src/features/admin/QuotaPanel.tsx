import type { FormEvent } from "react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";
import { Badge } from "../../shared/badge";
import { Button } from "../../shared/button";
import { CheckboxField, FormField, TextInput } from "../../shared/form";
import { Tag } from "../../shared/tag";

type QuotaPanelProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

function getRoleLabel(user: UserSummary) {
  return user.role === "admin" ? "管理员" : "成员";
}

function getUserDisplayName(user: UserSummary) {
  return user.name || user.email;
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
  onSelectQuotaUser,
  onSubmitQuota
}: QuotaPanelProps) {
  const selectedQuotaUser = adminQuota
    ? adminUsers.find((user) => user.id === adminQuota.userId) ?? null
    : null;

  return (
    <section className="panel workspace-card page-panel users-settings-panel">
      <div className="users-settings-panel-head">
        <div>
          <p className="panel-kicker">配额限制</p>
          <h2>配额策略</h2>
          <p className="section-copy">选择成员后，可调整每日外发额度，并暂停异常用户的外发能力。</p>
        </div>
        <div className="users-settings-section-meta compact">
          <span>{adminUsers.length} 个用户</span>
        </div>
      </div>

      {adminQuota ? (
        <section aria-label="当前配额目标" className="users-quota-current">
          <div className="users-quota-current-copy">
            <span>当前配额目标</span>
            <strong>{selectedQuotaUser ? getUserDisplayName(selectedQuotaUser) : adminQuota.userId}</strong>
            {selectedQuotaUser ? <small>{selectedQuotaUser.email}</small> : <small>用户 ID：{adminQuota.userId}</small>}
          </div>
          <div className="users-quota-meter">
            <strong>{adminQuota.sendsToday} / {adminQuota.dailyLimit}</strong>
            <Badge variant={adminQuota.disabled ? "warning" : "success"}>
              {adminQuota.disabled ? "已暂停" : "可外发"}
            </Badge>
          </div>
        </section>
      ) : null}

      <div className="stack-list workspace-stack-list workspace-stack-compact users-quota-user-list">
        {adminUsers.map((user) => (
          <Button
            aria-label={`选择配额用户 ${getUserDisplayName(user)} ${user.email} ${getRoleLabel(user)}`}
            className="stack-item selectable admin-stack-item users-settings-row users-quota-user-row"
            contentLayout="plain"
            isActive={adminQuota?.userId === user.id}
            key={user.id}
            onClick={() => void onSelectQuotaUser(user.id)}
            variant="text"
          >
            <div className="users-settings-row-main">
              <strong>{getUserDisplayName(user)}</strong>
              <span>{user.email}</span>
            </div>
            <div className="users-settings-row-actions">
              <Tag variant={user.role === "admin" ? "brand" : "neutral"}>{getRoleLabel(user)}</Tag>
              <Badge variant={getStatusVariant(user)}>{getStatusLabel(user)}</Badge>
            </div>
          </Button>
        ))}
        {adminUsers.length === 0 ? <p className="empty-state">当前还没有可配置配额的用户。</p> : null}
      </div>

      {adminQuota ? (
        <form
          aria-label="保存用户配额"
          className="composer-form users-quota-form"
          key={adminQuota.userId}
          onSubmit={(event) => void onSubmitQuota(event, adminQuota.userId)}
        >
          <FormField description={`今日已发送 ${adminQuota.sendsToday} 封`} label="每日发送上限">
            <TextInput defaultValue={adminQuota.dailyLimit} name="dailyLimit" type="number" />
          </FormField>
          <CheckboxField defaultChecked={adminQuota.disabled} label="暂停该用户的外发能力" name="disabled" />
          <Button size="sm" type="submit" variant="primary">
            保存配额
          </Button>
        </form>
      ) : (
        <p className="empty-state">请选择一个用户查看配额状态。</p>
      )}
    </section>
  );
}
