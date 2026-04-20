import { useEffect, useMemo, useState } from "react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";

import { UsersListPage } from "./UsersListPage";

type UsersListRoutePageProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: React.FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

type UsersRoleFilter = "all" | "admin" | "member";
type UsersStatusFilter = "all" | "active";

export function UsersListRoutePage({
  adminUsers,
  adminQuota,
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
      onCloseUserSettings={() => setSelectedUserId(null)}
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
