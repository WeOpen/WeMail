import type { FormEvent } from "react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";

type UsersRoleFilter = "all" | "admin" | "member";
type UsersStatusFilter = "all" | "active";

type UsersListPageProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  searchValue: string;
  roleFilter: UsersRoleFilter;
  statusFilter: UsersStatusFilter;
  selectedUser: UserSummary | null;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: UsersRoleFilter) => void;
  onStatusFilterChange: (value: UsersStatusFilter) => void;
  onOpenUserSettings: (userId: string) => void;
  onCloseUserSettings: () => void;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

function formatRole(role: UserSummary["role"]) {
  return role === "admin" ? "管理员" : "成员";
}

function buildDisplayName(email: string) {
  return email.split("@")[0] || email;
}

export function UsersListPage({
  adminUsers,
  adminQuota,
  searchValue,
  roleFilter,
  statusFilter,
  selectedUser,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onOpenUserSettings,
  onCloseUserSettings,
  onSubmitQuota
}: UsersListPageProps) {
  const normalizedQuery = searchValue.trim().toLowerCase();
  const visibleUsers = adminUsers.filter((user) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      buildDisplayName(user.email).toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || statusFilter === "active";
    return matchesQuery && matchesRole && matchesStatus;
  });

  return (
    <main className="workspace-grid users-list-grid">
      <section className="panel workspace-card page-panel users-page-header">
        <div className="users-page-header-copy">
          <p className="panel-kicker">用户列表</p>
          <h2>管理成员目录</h2>
          <p className="section-copy">搜索、筛选并进入单个用户的设置抽屉，专注目录与单人配置。</p>
        </div>
      </section>

      <section className="panel workspace-card page-panel users-filter-bar">
        <label className="users-filter-field">
          <span>搜索</span>
          <input
            aria-label="搜索用户"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索邮箱或显示名"
            value={searchValue}
          />
        </label>

        <label className="users-filter-field">
          <span>角色</span>
          <select aria-label="角色筛选" onChange={(event) => onRoleFilterChange(event.target.value as UsersRoleFilter)} value={roleFilter}>
            <option value="all">全部</option>
            <option value="admin">管理员</option>
            <option value="member">成员</option>
          </select>
        </label>

        <label className="users-filter-field">
          <span>状态</span>
          <select aria-label="状态筛选" onChange={(event) => onStatusFilterChange(event.target.value as UsersStatusFilter)} value={statusFilter}>
            <option value="all">全部</option>
            <option value="active">正常</option>
          </select>
        </label>
      </section>

      <section className="panel workspace-card page-panel users-table-panel">
        <div className="users-table-head">
          <span>用户</span>
          <span>角色</span>
          <span>创建时间</span>
          <span>状态</span>
          <span>操作</span>
        </div>

        <div className="users-table-body">
          {visibleUsers.map((user) => (
            <article className="users-table-row" key={user.id}>
              <div className="users-table-primary">
                <strong>{buildDisplayName(user.email)}</strong>
                <span>{user.email}</span>
              </div>
              <span>{formatRole(user.role)}</span>
              <span>{user.createdAt.slice(0, 10)}</span>
              <span>正常</span>
              <button className="workspace-action-button secondary" onClick={() => onOpenUserSettings(user.id)} type="button">
                查看设置
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedUser ? (
        <div className="users-drawer-backdrop" onClick={onCloseUserSettings} role="presentation">
          <aside
            aria-label="用户设置"
            className="users-drawer panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="users-drawer-head">
              <div>
                <p className="panel-kicker">用户设置</p>
                <h3>{buildDisplayName(selectedUser.email)}</h3>
                <span>{selectedUser.email}</span>
              </div>
              <button className="workspace-theme-toggle" onClick={onCloseUserSettings} type="button" aria-label="关闭用户设置">
                ×
              </button>
            </div>

            <div className="users-drawer-section">
              <strong>基本资料</strong>
              <div className="users-drawer-card">
                <span>角色：{formatRole(selectedUser.role)}</span>
                <span>创建时间：{selectedUser.createdAt.slice(0, 10)}</span>
              </div>
            </div>

            <div className="users-drawer-section">
              <strong>配额与能力</strong>
              {adminQuota ? (
                <form className="users-drawer-form" onSubmit={(event) => void onSubmitQuota(event, adminQuota.userId)}>
                  <label>
                    <span>每日发送上限</span>
                    <input defaultValue={adminQuota.dailyLimit} name="dailyLimit" type="number" />
                  </label>
                  <label className="checkbox-row">
                    <input defaultChecked={adminQuota.disabled} name="disabled" type="checkbox" />
                    暂停该用户的外发能力
                  </label>
                  <button className="workspace-action-button primary" type="submit">
                    保存用户设置
                  </button>
                </form>
              ) : (
                <p className="empty-state">正在加载该用户的配额信息。</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}