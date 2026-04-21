import { useState, type FormEvent } from "react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";

import { Button } from "../shared/button";
import { CheckboxField, FormField, SelectInput, TextInput } from "../shared/form";
import { OverlayDrawer } from "../shared/overlay";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow
} from "../shared/table";

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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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
  const visibleUserIds = visibleUsers.map((user) => user.id);
  const selectedCount = selectedUserIds.length;
  const allVisibleSelected = visibleUserIds.length > 0 && visibleUserIds.every((userId) => selectedUserIds.includes(userId));

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId) ? currentIds.filter((currentId) => currentId !== userId) : [...currentIds, userId]
    );
  }

  function toggleSelectAll() {
    setSelectedUserIds((currentIds) => {
      if (allVisibleSelected) {
        return currentIds.filter((userId) => !visibleUserIds.includes(userId));
      }

      return Array.from(new Set([...currentIds, ...visibleUserIds]));
    });
  }

  return (
    <main className="workspace-grid users-list-grid">
      <section className="panel workspace-card page-panel users-page-header">
        <div className="workspace-card-header">
          <div>
            <p className="panel-kicker">用户中心</p>
          </div>
          <div className="workspace-topbar-actions">
            <Button variant="primary">导出</Button>
          </div>
        </div>

        <div className="users-list-filter-grid">
          <FormField label={<span className="sr-only">搜索用户</span>}>
            <TextInput
              aria-label="搜索用户"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索邮箱或显示名"
              value={searchValue}
            />
          </FormField>

          <FormField label={<span className="sr-only">角色筛选</span>}>
            <SelectInput aria-label="角色筛选" onChange={(event) => onRoleFilterChange(event.target.value as UsersRoleFilter)} value={roleFilter}>
              <option value="all">全部</option>
              <option value="admin">管理员</option>
              <option value="member">成员</option>
            </SelectInput>
          </FormField>

          <FormField label={<span className="sr-only">状态筛选</span>}>
            <SelectInput aria-label="状态筛选" onChange={(event) => onStatusFilterChange(event.target.value as UsersStatusFilter)} value={statusFilter}>
              <option value="all">全部</option>
              <option value="active">正常</option>
            </SelectInput>
          </FormField>
        </div>
      </section>

      <section className="panel workspace-card page-panel users-table-panel">
        <div className="workspace-card-header">
          <div>
            <p className="panel-kicker">用户列表</p>
          </div>
        </div>

        {selectedCount > 0 ? (
          <section aria-label="用户批量操作条" className="panel workspace-card accounts-list-bulk-bar">
            <div className="workspace-card-header">
              <div>
                <p className="panel-kicker">批量操作</p>
                <h4>已选择 {selectedCount} 个用户</h4>
              </div>
              <div className="workspace-topbar-actions">
                <Button variant="primary">批量设为管理员</Button>
                <Button variant="secondary">批量设为成员</Button>
                <Button variant="secondary">批量暂停外发</Button>
              </div>
            </div>
          </section>
        ) : null}

        <TableContainer density="compact" variant="liquid">
          <Table className="users-list-table">
            <TableHead>
              <TableRow>
                <TableHeaderCell align="center" className="ui-table-sticky-start" width={56}>
                  <CheckboxField
                    aria-label="选择全部用户"
                    checked={allVisibleSelected}
                    className="checkbox-row"
                    label={<span className="sr-only">选择全部用户</span>}
                    onChange={toggleSelectAll}
                  />
                </TableHeaderCell>
                <TableHeaderCell>用户</TableHeaderCell>
                <TableHeaderCell>邮箱</TableHeaderCell>
                <TableHeaderCell>角色</TableHeaderCell>
                <TableHeaderCell>创建时间</TableHeaderCell>
                <TableHeaderCell>状态</TableHeaderCell>
                <TableHeaderCell className="ui-table-sticky-end" nowrap width={112}>
                  操作
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);

                return (
                  <TableRow isSelected={isSelected} key={user.id}>
                    <TableCell align="center" className="ui-table-sticky-start" width={56}>
                      <CheckboxField
                        aria-label={`选择用户 ${user.email}`}
                        checked={isSelected}
                        className="checkbox-row"
                        label={<span className="sr-only">选择用户 {user.email}</span>}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <strong>{buildDisplayName(user.email)}</strong>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatRole(user.role)}</TableCell>
                    <TableCell>{user.createdAt.slice(0, 10)}</TableCell>
                    <TableCell>
                      <span className="accounts-status-pill accounts-status-pill--enabled">正常</span>
                    </TableCell>
                    <TableCell className="ui-table-sticky-end" nowrap width={112}>
                      <Button onClick={() => onOpenUserSettings(user.id)} size="sm" variant="secondary">
                        查看设置
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      {selectedUser ? (
        <OverlayDrawer
          ariaLabel="用户设置"
          closeLabel="关闭用户设置"
          closeOnBackdrop
          description={selectedUser.email}
          eyebrow="用户设置"
          onClose={onCloseUserSettings}
          title={buildDisplayName(selectedUser.email)}
          width="md"
        >
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
                <Button type="submit" variant="primary">
                  保存用户设置
                </Button>
              </form>
            ) : (
              <p className="empty-state">正在加载该用户的配额信息。</p>
            )}
          </div>
        </OverlayDrawer>
      ) : null}
    </main>
  );
}
