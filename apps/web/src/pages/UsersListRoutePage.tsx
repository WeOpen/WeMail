import { useEffect, useMemo, useState } from "react";

import type { QuotaSummary, UserRole, UserStatus, UserSummary } from "@wemail/shared";

import type { AdminUsersQuery } from "../features/admin/types";
import { UsersListPage } from "./UsersListPage";

type UsersListRoutePageProps = {
  adminUsers: UserSummary[];
  adminUsersTotal: number;
  adminQuota: QuotaSummary | null;
  currentUserId: string;
  isLoadingUsers: boolean;
  onCreateUser: (payload: { email: string; name: string; password: string; role: UserRole }) => Promise<void>;
  onBulkChangeRole: (userIds: string[], role: UserRole) => Promise<void>;
  onBulkSuspendOutbound: (userIds: string[]) => Promise<void>;
  onUpdateUser: (userId: string, payload: { name: string }) => Promise<void>;
  onResetUserPassword: (userId: string, password: string) => Promise<void>;
  onUpdateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onRefreshUsers: (query: AdminUsersQuery) => Promise<void>;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: React.FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
  usersError: string | null;
};

type UsersRoleFilter = "all" | "admin" | "member";
type UsersStatusFilter = "all" | "active" | "disabled";

export function UsersListRoutePage({
  adminUsers,
  adminUsersTotal,
  adminQuota,
  currentUserId,
  isLoadingUsers,
  onCreateUser,
  onBulkChangeRole,
  onBulkSuspendOutbound,
  onUpdateUser,
  onResetUserPassword,
  onUpdateUserStatus,
  onDeleteUser,
  onRefreshUsers,
  onSelectQuotaUser,
  onSubmitQuota,
  usersError
}: UsersListRoutePageProps) {
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<UsersRoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<UsersStatusFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const selectedUser = useMemo(
    () => adminUsers.find((user) => user.id === selectedUserId) ?? null,
    [adminUsers, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUserId) return;
    void onSelectQuotaUser(selectedUserId);
  }, [onSelectQuotaUser, selectedUserId]);

  const usersQuery = useMemo(
    () => ({
      page,
      pageSize,
      search: searchValue,
      role: roleFilter,
      status: statusFilter
    }),
    [page, pageSize, roleFilter, searchValue, statusFilter]
  );

  useEffect(() => {
    void onRefreshUsers(usersQuery);
  }, [onRefreshUsers, usersQuery]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(adminUsersTotal / pageSize));
    if (page > pageCount) setPage(pageCount);
  }, [adminUsersTotal, page, pageSize]);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    setPage(1);
  }

  function handleRoleFilterChange(value: UsersRoleFilter) {
    setRoleFilter(value);
    setPage(1);
  }

  function handleStatusFilterChange(value: UsersStatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setPage(1);
  }

  return (
    <UsersListPage
      adminQuota={adminQuota}
      adminUsers={adminUsers}
      currentUserId={currentUserId}
      isLoadingUsers={isLoadingUsers}
      onBulkChangeRole={onBulkChangeRole}
      onBulkSuspendOutbound={onBulkSuspendOutbound}
      onCloseUserSettings={() => setSelectedUserId(null)}
      onCreateUser={onCreateUser}
      onDeleteUser={async (userId) => {
        await onDeleteUser(userId);
        if (selectedUserId === userId) setSelectedUserId(null);
      }}
      onExportUsers={exportUsersCsv}
      onOpenUserSettings={setSelectedUserId}
      onPageChange={setPage}
      onPageSizeChange={handlePageSizeChange}
      onRetryUsers={() => void onRefreshUsers(usersQuery)}
      onResetUserPassword={onResetUserPassword}
      onRoleFilterChange={handleRoleFilterChange}
      onSearchChange={handleSearchChange}
      onStatusFilterChange={handleStatusFilterChange}
      onSubmitQuota={onSubmitQuota}
      onUpdateUser={onUpdateUser}
      onUpdateUserStatus={onUpdateUserStatus}
      page={page}
      pageSize={pageSize}
      roleFilter={roleFilter}
      searchValue={searchValue}
      selectedUser={selectedUser}
      statusFilter={statusFilter}
      totalUsers={adminUsersTotal}
      usersError={usersError}
    />
  );
}

function exportUsersCsv(users: UserSummary[]) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const headers = ["用户名", "邮箱", "角色", "状态", "创建时间", "更新时间"];
  const rows = users.map((user) => [
    user.name,
    user.email,
    user.role === "admin" ? "管理员" : "成员",
    user.status === "disabled" ? "停用" : "正常",
    user.createdAt.slice(0, 10),
    user.updatedAt.slice(0, 10)
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${value.replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wemail-users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}
