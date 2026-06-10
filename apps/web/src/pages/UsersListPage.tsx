import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Edit3, KeyRound, MoreHorizontal, Plus, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

import type { QuotaSummary, UserRole, UserStatus, UserSummary } from "@wemail/shared";

import { Button } from "../shared/button";
import { Badge } from "../shared/badge";
import { FilterBar } from "../shared/filter-bar";
import { CheckboxField, FormField, SearchInput, SelectInput, TextInput } from "../shared/form";
import { OverlayDialog, OverlayDrawer } from "../shared/overlay";
import { Page, PageBody, PageHeader, PageMain, PageToolbar } from "../shared/page-layout";
import { Pagination } from "../shared/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "../shared/popover";
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
type UsersStatusFilter = "all" | "active" | "disabled";
const USERS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type UsersListPageProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  currentUserId?: string;
  isLoadingUsers?: boolean;
  searchValue: string;
  roleFilter: UsersRoleFilter;
  statusFilter: UsersStatusFilter;
  selectedUser: UserSummary | null;
  page?: number;
  pageSize?: number;
  totalUsers?: number;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: UsersRoleFilter) => void;
  onStatusFilterChange: (value: UsersStatusFilter) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRetryUsers?: () => void;
  onCreateUser: (payload: { email: string; name: string; password: string; role: UserRole }) => Promise<void>;
  onExportUsers: (users: UserSummary[]) => void;
  onBulkChangeRole: (userIds: string[], role: UserRole) => Promise<void>;
  onBulkSuspendOutbound: (userIds: string[]) => Promise<void>;
  onUpdateUser: (userId: string, payload: { name: string }) => Promise<void>;
  onResetUserPassword: (userId: string, password: string) => Promise<void>;
  onUpdateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onOpenUserSettings: (userId: string) => void;
  onCloseUserSettings: () => void;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
  usersError?: string | null;
};

function formatRole(role: UserSummary["role"]) {
  return role === "admin" ? "管理员" : "成员";
}

function buildDisplayName(user: UserSummary) {
  return user.name || user.email.split("@")[0] || user.email;
}

function resolveStatus(user: UserSummary): UserStatus {
  return user.status;
}

function formatStatus(status: UserStatus) {
  return status === "disabled" ? "停用" : "正常";
}

function resolveNextStatus(user: UserSummary): UserStatus {
  return user.status === "active" ? "disabled" : "active";
}

function formatStatusAction(status: UserStatus) {
  return status === "disabled" ? "停用" : "启用";
}

function formatStatusActionError(error: unknown) {
  if (error instanceof Error && error.message.includes("Cannot disable current user")) {
    return "不能停用当前登录用户。";
  }

  return "用户状态更新失败，请稍后重试。";
}

function formatDeleteActionError(error: unknown) {
  if (error instanceof Error && error.message.includes("Cannot delete current user")) {
    return "不能删除当前登录用户。";
  }

  return "用户删除失败，请稍后重试。";
}

type UserActionMenuProps = {
  onEdit: (user: UserSummary) => void;
  onRequestDelete: (user: UserSummary) => void;
  onRequestStatusChange: (user: UserSummary) => void;
  onResetPassword: (user: UserSummary) => void;
  user: UserSummary;
};

function UserActionMenu({ onEdit, onRequestDelete, onRequestStatusChange, onResetPassword, user }: UserActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const nextStatus = resolveNextStatus(user);
  const statusAction = formatStatusAction(nextStatus);
  const menuName = `${buildDisplayName(user)} 操作`;

  function runAction(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger className="ui-button ui-button-secondary ui-button-size-md users-action-trigger">
        <span className="ui-button-icon-slot" aria-hidden="true">
          <MoreHorizontal />
        </span>
        <span className="ui-button-label">操作</span>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={menuName} className="users-action-menu">
        <Button
          className="users-action-menu-item"
          leadingIcon={<Edit3 aria-hidden="true" />}
          onClick={() => runAction(() => onEdit(user))}
          variant="ghost"
        >
          修改
        </Button>
        <Button
          className="users-action-menu-item"
          leadingIcon={<KeyRound aria-hidden="true" />}
          onClick={() => runAction(() => onResetPassword(user))}
          variant="ghost"
        >
          重置密码
        </Button>
        <Button
          className="users-action-menu-item"
          leadingIcon={nextStatus === "disabled" ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
          onClick={() => runAction(() => onRequestStatusChange(user))}
          variant="ghost"
        >
          {statusAction}
        </Button>
        <Button
          className="users-action-menu-item users-action-menu-item-danger"
          leadingIcon={<Trash2 aria-hidden="true" />}
          onClick={() => runAction(() => onRequestDelete(user))}
          variant="ghost"
        >
          删除
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function UsersListPage({
  adminUsers,
  adminQuota,
  currentUserId,
  isLoadingUsers = false,
  searchValue,
  roleFilter,
  statusFilter,
  selectedUser,
  page: controlledPage,
  pageSize: controlledPageSize,
  totalUsers,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onPageChange,
  onPageSizeChange,
  onRetryUsers,
  onCreateUser,
  onExportUsers,
  onBulkChangeRole,
  onBulkSuspendOutbound,
  onUpdateUser,
  onResetUserPassword,
  onUpdateUserStatus,
  onDeleteUser,
  onOpenUserSettings,
  onCloseUserSettings,
  onSubmitQuota,
  usersError = null
}: UsersListPageProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<UserSummary | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [statusConfirmUser, setStatusConfirmUser] = useState<UserSummary | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserSummary | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState<number>(USERS_PAGE_SIZE_OPTIONS[0]);
  const isServerPaginated = typeof totalUsers === "number";
  const activePage = controlledPage ?? localPage;
  const activePageSize = controlledPageSize ?? localPageSize;
  const filteredUsers = useMemo(() => {
    if (isServerPaginated) return adminUsers;

    const normalizedQuery = searchValue.trim().toLowerCase();

    return adminUsers.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        buildDisplayName(user).toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || resolveStatus(user) === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [adminUsers, isServerPaginated, roleFilter, searchValue, statusFilter]);
  const paginationTotal = totalUsers ?? filteredUsers.length;
  const pageCount = Math.max(1, Math.ceil(paginationTotal / activePageSize));
  const currentPage = Math.min(activePage, pageCount);
  const visibleUsers = useMemo(() => {
    if (isServerPaginated) return filteredUsers;

    const startIndex = (currentPage - 1) * activePageSize;

    return filteredUsers.slice(startIndex, startIndex + activePageSize);
  }, [activePageSize, currentPage, filteredUsers, isServerPaginated]);
  const visibleUserIds = visibleUsers.map((user) => user.id);
  const selectedCount = selectedUserIds.length;
  const allVisibleSelected = visibleUserIds.length > 0 && visibleUserIds.every((userId) => selectedUserIds.includes(userId));

  useEffect(() => {
    if (!isServerPaginated) setLocalPage(1);
  }, [isServerPaginated, roleFilter, searchValue, statusFilter]);

  useEffect(() => {
    if (!isServerPaginated && localPage > pageCount) {
      setLocalPage(pageCount);
    }
  }, [isServerPaginated, localPage, pageCount]);

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

  function isCurrentUser(user: UserSummary) {
    return Boolean(currentUserId && user.id === currentUserId);
  }

  function handlePageSizeChange(nextPageSize: number) {
    if (onPageSizeChange) {
      onPageSizeChange(nextPageSize);
      return;
    }

    setLocalPageSize(nextPageSize);
    setLocalPage(1);
  }

  function handlePageChange(nextPage: number) {
    if (onPageChange) {
      onPageChange(nextPage);
      return;
    }

    setLocalPage(nextPage);
  }

  function isStatusActionProtected(user: UserSummary) {
    return isCurrentUser(user) && resolveNextStatus(user) === "disabled";
  }

  function openStatusConfirm(user: UserSummary) {
    setStatusConfirmUser(user);
    setStatusActionError(isStatusActionProtected(user) ? "不能停用当前登录用户。" : null);
  }

  function closeStatusConfirm() {
    setStatusConfirmUser(null);
    setStatusActionError(null);
  }

  function openDeleteConfirm(user: UserSummary) {
    setDeleteUser(user);
    setDeleteUserError(isCurrentUser(user) ? "不能删除当前登录用户。" : null);
  }

  function closeDeleteConfirm() {
    setDeleteUser(null);
    setDeleteUserError(null);
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const role = String(form.get("role") ?? "member") as UserRole;

    if (!name || !email || !password) {
      setCreateUserError("请填写用户名、邮箱和初始密码。");
      return;
    }

    setIsCreatingUser(true);
    setCreateUserError(null);
    try {
      await onCreateUser({ email, name, password, role });
      setIsCreateDrawerOpen(false);
      event.currentTarget.reset();
    } catch {
      setCreateUserError("用户创建失败，请稍后重试。");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();

    if (!name) {
      setEditUserError("请填写用户名。");
      return;
    }

    setIsUpdatingUser(true);
    setEditUserError(null);
    try {
      await onUpdateUser(selectedUser.id, { name });
      onCloseUserSettings();
    } catch {
      setEditUserError("用户资料保存失败，请稍后重试。");
    } finally {
      setIsUpdatingUser(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordResetUser) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    if (password.length < 8) {
      setResetPasswordError("新密码至少需要 8 位。");
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError(null);
    try {
      await onResetUserPassword(passwordResetUser.id, password);
      setPasswordResetUser(null);
    } catch {
      setResetPasswordError("密码重置失败，请稍后重试。");
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleConfirmUserStatus() {
    if (!statusConfirmUser) return;
    const nextStatus = resolveNextStatus(statusConfirmUser);

    if (isStatusActionProtected(statusConfirmUser)) {
      setStatusActionError("不能停用当前登录用户。");
      return;
    }

    setStatusActionError(null);
    setStatusUpdatingUserId(statusConfirmUser.id);
    try {
      await onUpdateUserStatus(statusConfirmUser.id, nextStatus);
      closeStatusConfirm();
    } catch (error) {
      setStatusActionError(formatStatusActionError(error));
    } finally {
      setStatusUpdatingUserId(null);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;

    if (isCurrentUser(deleteUser)) {
      setDeleteUserError("不能删除当前登录用户。");
      return;
    }

    setDeleteUserError(null);
    setIsDeletingUser(true);
    try {
      await onDeleteUser(deleteUser.id);
      closeDeleteConfirm();
    } catch (error) {
      setDeleteUserError(formatDeleteActionError(error));
    } finally {
      setIsDeletingUser(false);
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

  const statusConfirmNextStatus = statusConfirmUser ? resolveNextStatus(statusConfirmUser) : null;
  const statusConfirmAction = statusConfirmNextStatus ? formatStatusAction(statusConfirmNextStatus) : "";
  const isStatusConfirmProtected = Boolean(statusConfirmUser && isStatusActionProtected(statusConfirmUser));
  const isStatusConfirmLoading = Boolean(statusConfirmUser && statusUpdatingUserId === statusConfirmUser.id);
  const isDeleteProtected = Boolean(deleteUser && isCurrentUser(deleteUser));

  return (
    <Page className="workspace-grid users-list-grid">
      <section className="panel workspace-card page-panel users-page-header">
        <PageHeader
          actions={
            <div className="workspace-topbar-actions">
              <Button
                disabled={!onRetryUsers || isLoadingUsers}
                isLoading={isLoadingUsers}
                leadingIcon={<RefreshCw aria-hidden="true" />}
                loadingLabel="刷新中"
                onClick={onRetryUsers}
                variant="secondary"
              >
                刷新
              </Button>
              <Button leadingIcon={<Download aria-hidden="true" />} onClick={() => onExportUsers(filteredUsers)} variant="primary">
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
                placeholder="搜索邮箱或用户名"
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
                <option value="disabled">停用</option>
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

          {usersError ? (
            <div className="users-list-state" role="alert">
              <p className="form-message" data-tone="error">
                {usersError}
              </p>
              {onRetryUsers ? (
                <Button onClick={onRetryUsers} variant="secondary">
                  重试
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {isLoadingUsers ? (
                <p aria-busy="true" aria-label="正在加载用户列表" className="users-list-status" role="status">
                  正在加载用户列表
                </p>
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
                      <TableHeaderCell>用户名</TableHeaderCell>
                      <TableHeaderCell>邮箱</TableHeaderCell>
                      <TableHeaderCell>角色</TableHeaderCell>
                      <TableHeaderCell>创建时间</TableHeaderCell>
                      <TableHeaderCell>状态</TableHeaderCell>
                      <TableHeaderCell className="ui-table-sticky-end" nowrap width={128}>
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
                            <strong>{buildDisplayName(user)}</strong>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{formatRole(user.role)}</TableCell>
                          <TableCell>{user.createdAt.slice(0, 10)}</TableCell>
                          <TableCell>
                            <Badge variant={status === "disabled" ? "warning" : "success"}>{formatStatus(status)}</Badge>
                          </TableCell>
                          <TableCell className="ui-table-sticky-end" nowrap width={128}>
                            <div className="users-action-cell">
                              <UserActionMenu
                                onEdit={(currentUser) => onOpenUserSettings(currentUser.id)}
                                onRequestDelete={openDeleteConfirm}
                                onRequestStatusChange={openStatusConfirm}
                                onResetPassword={(currentUser) => {
                                  setPasswordResetUser(currentUser);
                                  setResetPasswordError(null);
                                }}
                                user={user}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {visibleUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <p className="empty-state">暂无符合条件的用户。</p>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          <Pagination
            aria-label="用户列表分页"
            className="users-list-pagination"
            onChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={currentPage}
            pageSize={activePageSize}
            pageSizeOptions={USERS_PAGE_SIZE_OPTIONS}
            total={paginationTotal}
          />
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
          <form className="users-flat-form" onSubmit={(event) => void handleCreateUser(event)}>
            <FormField htmlFor="create-user-name" label="用户名" required>
              <TextInput id="create-user-name" name="name" placeholder="New User" required />
            </FormField>
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
          ariaLabel="修改用户"
          closeLabel="关闭修改用户"
          closeOnBackdrop
          description={selectedUser.email}
          eyebrow="用户列表"
          onClose={() => {
            setEditUserError(null);
            onCloseUserSettings();
          }}
          title="修改用户"
          width="sm"
        >
          <form className="users-flat-form" onSubmit={(event) => void handleUpdateUser(event)}>
            <FormField htmlFor="edit-user-name" label="用户名" required>
              <TextInput
                defaultValue={selectedUser.name}
                id="edit-user-name"
                key={selectedUser.id}
                name="name"
                placeholder="用户名"
                required
              />
            </FormField>
            {editUserError ? (
              <p className="form-message" data-tone="error" role="alert">
                {editUserError}
              </p>
            ) : null}
            <Button isLoading={isUpdatingUser} loadingLabel="保存中" type="submit" variant="primary">
              保存修改
            </Button>
          </form>

          <div className="users-drawer-section">
            <strong>基本资料</strong>
            <div className="users-drawer-card">
              <span>用户名：{selectedUser.name}</span>
              <span>角色：{formatRole(selectedUser.role)}</span>
              <span>状态：{formatStatus(resolveStatus(selectedUser))}</span>
              <span>创建时间：{selectedUser.createdAt.slice(0, 10)}</span>
              <span>更新时间：{selectedUser.updatedAt.slice(0, 10)}</span>
            </div>
          </div>

          <div className="users-drawer-section">
            <strong>配额与能力</strong>
            {adminQuota ? (
              <form className="users-flat-form" onSubmit={(event) => void onSubmitQuota(event, adminQuota.userId)}>
                <label>
                  <span>每日发送上限</span>
                  <input defaultValue={adminQuota.dailyLimit} name="dailyLimit" type="number" />
                </label>
                <label className="checkbox-row">
                  <input defaultChecked={adminQuota.disabled} name="disabled" type="checkbox" />
                  暂停该用户的外发能力
                </label>
                <Button type="submit" variant="primary">
                  保存配额设置
                </Button>
              </form>
            ) : (
              <p className="empty-state">正在加载该用户的配额信息。</p>
            )}
          </div>
        </OverlayDrawer>
      ) : null}

      {passwordResetUser ? (
        <OverlayDialog
          closeLabel="关闭重置密码"
          closeOnBackdrop
          description={passwordResetUser.email}
          eyebrow="账号安全"
          onClose={() => {
            setPasswordResetUser(null);
            setResetPasswordError(null);
          }}
          title="重置密码"
        >
          <form className="users-flat-form" onSubmit={(event) => void handleResetPassword(event)}>
            <FormField htmlFor="reset-user-password" label="新密码" required>
              <TextInput id="reset-user-password" minLength={8} name="password" required type="password" />
            </FormField>
            {resetPasswordError ? (
              <p className="form-message" data-tone="error" role="alert">
                {resetPasswordError}
              </p>
            ) : null}
            <Button isLoading={isResettingPassword} loadingLabel="重置中" type="submit" variant="primary">
              确认重置
            </Button>
          </form>
        </OverlayDialog>
      ) : null}

      {statusConfirmUser ? (
        <OverlayDialog
          closeLabel={`关闭${statusConfirmAction}确认`}
          closeOnBackdrop
          description={statusConfirmUser.email}
          eyebrow={statusConfirmNextStatus === "disabled" ? "保护操作" : "用户状态"}
          onClose={closeStatusConfirm}
          title={`${statusConfirmAction}用户`}
        >
          <div className="users-dialog-body">
            <p className="section-copy">
              确认{statusConfirmAction}用户 {buildDisplayName(statusConfirmUser)}？{statusConfirmNextStatus === "disabled" ? "停用后该用户将无法继续登录。" : ""}
            </p>
            {statusActionError ? (
              <p className="form-message" data-tone="error" role="alert">
                {statusActionError}
              </p>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button disabled={isStatusConfirmLoading} onClick={closeStatusConfirm} variant="secondary">
                取消
              </Button>
              <Button
                disabled={isStatusConfirmProtected}
                isLoading={isStatusConfirmLoading}
                loadingLabel="处理中"
                onClick={() => void handleConfirmUserStatus()}
                variant={statusConfirmNextStatus === "disabled" ? "danger" : "primary"}
              >
                确认{statusConfirmAction}
              </Button>
            </div>
          </div>
        </OverlayDialog>
      ) : null}

      {deleteUser ? (
        <OverlayDialog
          closeLabel="关闭删除确认"
          closeOnBackdrop
          description={deleteUser.email}
          eyebrow="危险操作"
          onClose={closeDeleteConfirm}
          title="删除用户"
        >
          <div className="users-dialog-body">
            <p className="section-copy">删除后该用户将从用户列表移除，并清理该用户的会话、配额、API 密钥和 Telegram 订阅。</p>
            {deleteUserError ? (
              <p className="form-message" data-tone="error" role="alert">
                {deleteUserError}
              </p>
            ) : null}
            <div className="workspace-dialog-actions">
              <Button disabled={isDeletingUser} onClick={closeDeleteConfirm} variant="secondary">
                取消
              </Button>
              <Button
                disabled={isDeleteProtected}
                isLoading={isDeletingUser}
                loadingLabel="删除中"
                onClick={() => void handleDeleteUser()}
                variant="danger"
              >
                确认删除
              </Button>
            </div>
          </div>
        </OverlayDialog>
      ) : null}
    </Page>
  );
}
