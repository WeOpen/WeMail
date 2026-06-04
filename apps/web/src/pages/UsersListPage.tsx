import { useState, type FormEvent } from "react";
import { Download, Plus } from "lucide-react";

import type { QuotaSummary, UserRole, UserStatus, UserSummary } from "@wemail/shared";

import { Button } from "../shared/button";
import { Badge } from "../shared/badge";
import { FilterBar } from "../shared/filter-bar";
import { CheckboxField, FormField, SearchInput, SelectInput, TextInput } from "../shared/form";
import { OverlayDrawer } from "../shared/overlay";
import { Page, PageBody, PageHeader, PageMain, PageToolbar } from "../shared/page-layout";
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
type UsersStatusFilter = "all" | "active" | "outbound_disabled";

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
  onCreateUser: (payload: { email: string; password: string; role: UserRole }) => Promise<void>;
  onExportUsers: (users: UserSummary[]) => void;
  onBulkChangeRole: (userIds: string[], role: UserRole) => Promise<void>;
  onBulkSuspendOutbound: (userIds: string[]) => Promise<void>;
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

function resolveStatus(user: UserSummary): UserStatus {
  return user.status ?? "active";
}

function formatStatus(status: UserStatus) {
  return status === "outbound_disabled" ? "外发暂停" : "正常";
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
  onCreateUser,
  onExportUsers,
  onBulkChangeRole,
  onBulkSuspendOutbound,
  onOpenUserSettings,
  onCloseUserSettings,
  onSubmitQuota
}: UsersListPageProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const normalizedQuery = searchValue.trim().toLowerCase();
  const visibleUsers = adminUsers.filter((user) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      buildDisplayName(user.email).toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || resolveStatus(user) === statusFilter;
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

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const role = String(form.get("role") ?? "member") as UserRole;

    if (!email || !password) {
      setCreateUserError("请填写邮箱和初始密码。");
      return;
    }

    setIsCreatingUser(true);
    setCreateUserError(null);
    try {
      await onCreateUser({ email, password, role });
      setIsCreateDrawerOpen(false);
      event.currentTarget.reset();
    } catch {
      setCreateUserError("用户创建失败，请稍后重试。");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleBulkRoleChange(role: UserRole) {
    setIsBulkUpdating(true);
    try {
      await onBulkChangeRole(selectedUserIds, role);
      setSelectedUserIds([]);
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleBulkSuspendOutbound() {
    setIsBulkUpdating(true);
    try {
      await onBulkSuspendOutbound(selectedUserIds);
      setSelectedUserIds([]);
    } finally {
      setIsBulkUpdating(false);
    }
  }

  return (
    <Page className="workspace-grid users-list-grid">
      <section className="panel workspace-card page-panel users-page-header">
        <PageHeader
          actions={
            <div className="workspace-topbar-actions">
              <Button leadingIcon={<Download aria-hidden="true" />} onClick={() => onExportUsers(visibleUsers)} variant="secondary">
                导出
              </Button>
            </div>
          }
          kicker="用户中心"
        />

        <PageToolbar>
          <FilterBar className="users-list-filter-grid" columns={3}>
            <FormField label={<span className="sr-only">搜索用户</span>}>
              <SearchInput
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
                <option value="outbound_disabled">外发暂停</option>
              </SelectInput>
            </FormField>
          </FilterBar>
        </PageToolbar>
      </section>

      <PageBody>
        <PageMain className="panel workspace-card page-panel users-table-panel">
          <div className="workspace-card-header">
            <div>
              <p className="panel-kicker">用户列表</p>
            </div>
            <Button leadingIcon={<Plus aria-hidden="true" />} onClick={() => setIsCreateDrawerOpen(true)} variant="primary">
              新增用户
            </Button>
          </div>

          {selectedCount > 0 ? (
            <section aria-label="用户批量操作条" className="panel workspace-card accounts-list-bulk-bar">
              <PageHeader
                actions={
                  <div className="workspace-topbar-actions">
                    <Button disabled={isBulkUpdating} onClick={() => void handleBulkRoleChange("admin")} variant="primary">
                      批量设为管理员
                    </Button>
                    <Button disabled={isBulkUpdating} onClick={() => void handleBulkRoleChange("member")} variant="secondary">
                      批量设为成员
                    </Button>
                    <Button disabled={isBulkUpdating} onClick={() => void handleBulkSuspendOutbound()} variant="secondary">
                      批量暂停外发
                    </Button>
                  </div>
                }
                kicker="批量操作"
                title={`已选择 ${selectedCount} 个用户`}
              />
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
                  const status = resolveStatus(user);

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
                        <Badge variant={status === "outbound_disabled" ? "warning" : "success"}>{formatStatus(status)}</Badge>
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
        </PageMain>
      </PageBody>

      {isCreateDrawerOpen ? (
        <OverlayDrawer
          ariaLabel="新增用户"
          closeLabel="关闭新增用户"
          closeOnBackdrop
          eyebrow="用户列表"
          onClose={() => {
            setIsCreateDrawerOpen(false);
            setCreateUserError(null);
          }}
          title="新增用户"
          width="sm"
        >
          <form className="users-drawer-form" onSubmit={(event) => void handleCreateUser(event)}>
            <FormField htmlFor="create-user-email" label="邮箱" required>
              <TextInput id="create-user-email" name="email" placeholder="name@example.com" required type="email" />
            </FormField>
            <FormField htmlFor="create-user-password" label="初始密码" required>
              <TextInput id="create-user-password" minLength={8} name="password" required type="password" />
            </FormField>
            <FormField htmlFor="create-user-role" label="角色" required>
              <SelectInput defaultValue="member" id="create-user-role" name="role">
                <option value="member">成员</option>
                <option value="admin">管理员</option>
              </SelectInput>
            </FormField>
            {createUserError ? (
              <p className="form-message" data-tone="error" role="alert">
                {createUserError}
              </p>
            ) : null}
            <Button isLoading={isCreatingUser} loadingLabel="创建中" type="submit" variant="primary">
              创建用户
            </Button>
          </form>
        </OverlayDrawer>
      ) : null}

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
              <span>状态：{formatStatus(resolveStatus(selectedUser))}</span>
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
    </Page>
  );
}
