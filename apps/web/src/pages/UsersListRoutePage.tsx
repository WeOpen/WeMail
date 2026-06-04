import { useEffect, useMemo, useState } from "react";

import type { QuotaSummary, UserRole, UserSummary } from "@wemail/shared";

import { UsersListPage } from "./UsersListPage";

type UsersListRoutePageProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  onCreateUser: (payload: { email: string; password: string; role: UserRole }) => Promise<void>;
  onBulkChangeRole: (userIds: string[], role: UserRole) => Promise<void>;
  onBulkSuspendOutbound: (userIds: string[]) => Promise<void>;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: React.FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

type UsersRoleFilter = "all" | "admin" | "member";
type UsersStatusFilter = "all" | "active" | "outbound_disabled";

export function UsersListRoutePage({
  adminUsers,
  adminQuota,
  onCreateUser,
  onBulkChangeRole,
  onBulkSuspendOutbound,
  onSelectQuotaUser,
  onSubmitQuota
}: UsersListRoutePageProps) {
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<UsersRoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<UsersStatusFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => adminUsers.find((user) => user.id === selectedUserId) ?? null,
    [adminUsers, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUserId) return;
    void onSelectQuotaUser(selectedUserId);
  }, [onSelectQuotaUser, selectedUserId]);

  return (
    <UsersListPage
      adminQuota={adminQuota}
      adminUsers={adminUsers}
      onBulkChangeRole={onBulkChangeRole}
      onBulkSuspendOutbound={onBulkSuspendOutbound}
      onCloseUserSettings={() => setSelectedUserId(null)}
      onCreateUser={onCreateUser}
      onExportUsers={exportUsersCsv}
      onOpenUserSettings={setSelectedUserId}
      onRoleFilterChange={setRoleFilter}
      onSearchChange={setSearchValue}
      onStatusFilterChange={setStatusFilter}
      onSubmitQuota={onSubmitQuota}
      roleFilter={roleFilter}
      searchValue={searchValue}
      selectedUser={selectedUser}
      statusFilter={statusFilter}
    />
  );
}

function exportUsersCsv(users: UserSummary[]) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const headers = ["邮箱", "角色", "状态", "创建时间"];
  const rows = users.map((user) => [
    user.email,
    user.role === "admin" ? "管理员" : "成员",
    (user.status ?? "active") === "outbound_disabled" ? "外发暂停" : "正常",
    user.createdAt.slice(0, 10)
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
