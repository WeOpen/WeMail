import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuotaSummary, UserSummary } from "@wemail/shared";

import { UsersListPage } from "../pages/UsersListPage";
import { UsersListRoutePage } from "../pages/UsersListRoutePage";

const adminUsers: UserSummary[] = [
  {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    status: "active",
    createdAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z"
  },
  {
    id: "member-1",
    email: "member@example.com",
    name: "Member User",
    role: "member",
    status: "disabled",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-12T00:00:00.000Z"
  }
];

const adminQuota: QuotaSummary = {
  userId: "member-1",
  dailyLimit: 20,
  sendsToday: 8,
  disabled: false,
  updatedAt: "2026-04-10T00:00:00.000Z"
};

function createPagedUsers(): UserSummary[] {
  return [
    ...adminUsers,
    ...Array.from({ length: 10 }, (_, index) => {
      const userNumber = index + 3;
      return {
        id: `user-${userNumber}`,
        email: `user${userNumber}@example.com`,
        name: `Paged User ${userNumber}`,
        role: "member" as const,
        status: "active" as const,
        createdAt: `2026-04-${String(userNumber).padStart(2, "0")}T00:00:00.000Z`,
        updatedAt: `2026-04-${String(userNumber).padStart(2, "0")}T00:00:00.000Z`
      };
    })
  ];
}

type UsersListPageRenderProps = ComponentProps<typeof UsersListPage>;

function createUsersListProps(overrides: Partial<UsersListPageRenderProps> = {}): UsersListPageRenderProps {
  return {
    adminQuota: null,
    adminUsers,
    currentUserId: "admin-1",
    onBulkChangeRole: vi.fn(),
    onBulkSuspendOutbound: vi.fn(),
    onCloseUserSettings: vi.fn(),
    onCreateUser: vi.fn(),
    onDeleteUser: vi.fn(),
    onExportUsers: vi.fn(),
    onOpenUserSettings: vi.fn(),
    onResetUserPassword: vi.fn(),
    onRoleFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    onStatusFilterChange: vi.fn(),
    onSubmitQuota: vi.fn(),
    onUpdateUser: vi.fn(),
    onUpdateUserStatus: vi.fn(),
    roleFilter: "all",
    searchValue: "",
    selectedUser: null,
    statusFilter: "all",
    ...overrides
  };
}

function renderUsersList(overrides: Partial<UsersListPageRenderProps> = {}) {
  return render(<UsersListPage {...createUsersListProps(overrides)} />);
}

function createUsersListRouteProps(overrides: Partial<ComponentProps<typeof UsersListRoutePage>> = {}) {
  return {
    adminQuota: null,
    adminUsers,
    adminUsersTotal: adminUsers.length,
    currentUserId: "admin-1",
    isLoadingUsers: false,
    onBulkChangeRole: vi.fn(),
    onBulkSuspendOutbound: vi.fn(),
    onCreateUser: vi.fn(),
    onDeleteUser: vi.fn(),
    onRefreshUsers: vi.fn().mockResolvedValue(undefined),
    onResetUserPassword: vi.fn(),
    onSelectQuotaUser: vi.fn(),
    onSubmitQuota: vi.fn(),
    onUpdateUser: vi.fn(),
    onUpdateUserStatus: vi.fn(),
    usersError: null,
    ...overrides
  } satisfies ComponentProps<typeof UsersListRoutePage>;
}

async function openActionsForUser(email: string, menuName: string) {
  const row = screen.getByText(email).closest("tr");
  expect(row).not.toBeNull();

  fireEvent.click(within(row!).getByRole("button", { name: "操作" }));

  return within(await screen.findByRole("dialog", { name: menuName }));
}

describe("UsersListPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the directory-style users list with search, filters, and one compact action entry per row", () => {
    const onRetryUsers = vi.fn();
    renderUsersList({ onRetryUsers });

    expect(screen.getByText("用户中心")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "管理成员目录" })).not.toBeInTheDocument();
    const headerActions = screen.getByText("用户中心").closest("section")!.querySelector(".workspace-topbar-actions");
    expect(headerActions).not.toBeNull();
    expect(within(headerActions as HTMLElement).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "刷新",
      "导出"
    ]);
    expect(screen.getByRole("button", { name: "刷新" })).toHaveClass("ui-button-secondary");
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    expect(onRetryUsers).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "导出" })).toHaveClass("ui-button-primary");
    expect(screen.getByRole("button", { name: "新增用户" })).toHaveClass("ui-button-primary");
    expect(screen.getByRole("table")).toHaveClass("ui-table");
    expect(screen.getByRole("columnheader", { name: "用户名" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "姓名" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "邮箱" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "角色" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "操作" })).toHaveClass("ui-table-sticky-end");
    expect(screen.getByRole("checkbox", { name: "选择全部用户" }).closest("th")).toHaveClass("ui-table-sticky-start");
    expect(screen.getAllByText("正常").find((element) => element.classList.contains("ui-badge"))).toHaveClass(
      "ui-badge",
      "ui-badge-success"
    );
    expect(screen.getByPlaceholderText("搜索邮箱或用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("角色筛选")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Member User")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("停用").find((element) => element.classList.contains("ui-badge"))).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "操作" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "修改" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重置密码" })).not.toBeInTheDocument();
    expect(screen.queryByText("筛选摘要")).not.toBeInTheDocument();
  });

  it("shows loading and error states for the user list data request", () => {
    const onRetryUsers = vi.fn();
    const { rerender } = renderUsersList({
      adminUsers: [],
      isLoadingUsers: true,
      totalUsers: 0
    });

    expect(screen.getByRole("status", { name: "正在加载用户列表" })).toHaveTextContent("正在加载用户列表");
    expect(screen.getByText("暂无符合条件的用户。")).toBeInTheDocument();

    rerender(
      <UsersListPage
        {...createUsersListProps({
          adminUsers: [],
          onRetryUsers,
          totalUsers: 0,
          usersError: "用户列表加载失败，请稍后重试。"
        })}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("用户列表加载失败，请稍后重试。");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(onRetryUsers).toHaveBeenCalled();
  });

  it("filters the visible rows based on search and role props", () => {
    const { rerender } = renderUsersList({ searchValue: "Member User" });

    expect(screen.queryByText("admin@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();

    rerender(<UsersListPage {...createUsersListProps({ roleFilter: "admin" })} />);

    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.queryByText("member@example.com")).not.toBeInTheDocument();
  });

  it("paginates the filtered users list and resets to the first page when filters change", async () => {
    const pagedUsers = createPagedUsers();
    const { rerender } = renderUsersList({ adminUsers: pagedUsers });

    expect(screen.getByRole("navigation", { name: "用户列表分页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 1 页" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Paged User 10")).toBeInTheDocument();
    expect(screen.queryByText("Paged User 11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "第 2 页" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute("aria-current", "page");
    });
    expect(screen.queryByText("Admin User")).not.toBeInTheDocument();
    expect(screen.getByText("Paged User 11")).toBeInTheDocument();
    expect(screen.getByText("Paged User 12")).toBeInTheDocument();

    rerender(<UsersListPage {...createUsersListProps({ adminUsers: pagedUsers, searchValue: "Paged User 11" })} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "第 1 页" })).toHaveAttribute("aria-current", "page");
    });
    expect(screen.getByText("Paged User 11")).toBeInTheDocument();
    expect(screen.queryByText("Paged User 12")).not.toBeInTheDocument();
  });

  it("shows total users and lets admins change user list page size", async () => {
    const pagedUsers = createPagedUsers();
    renderUsersList({ adminUsers: pagedUsers });
    const pageSizeSelect = screen.getByRole("combobox", { name: "每页条数" });

    expect(screen.getByText("共 12 条")).toBeInTheDocument();
    expect(pageSizeSelect).toHaveTextContent("10");
    expect(screen.queryByText("Paged User 11")).not.toBeInTheDocument();

    fireEvent.click(pageSizeSelect);
    fireEvent.click(within(await screen.findByRole("listbox", { name: "每页条数" })).getByRole("option", { name: "20" }));

    await waitFor(() => {
      expect(pageSizeSelect).toHaveTextContent("20");
    });
    expect(screen.getByText("Paged User 11")).toBeInTheDocument();
    expect(screen.getByText("Paged User 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 1 页" })).toHaveAttribute("aria-current", "page");
  });

  it("uses controlled server pagination when total and page props are provided", async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const pagedUsers = createPagedUsers();

    renderUsersList({
      adminUsers: pagedUsers.slice(10, 12),
      onPageChange,
      onPageSizeChange,
      page: 2,
      pageSize: 10,
      totalUsers: 12
    });

    expect(screen.getByText("共 12 条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Paged User 11")).toBeInTheDocument();
    expect(screen.getByText("Paged User 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "上一页" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("combobox", { name: "每页条数" }));
    fireEvent.click(within(await screen.findByRole("listbox", { name: "每页条数" })).getByRole("option", { name: "20" }));

    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it("asks the route data source for the selected server page", async () => {
    const onRefreshUsers = vi.fn().mockResolvedValue(undefined);

    render(
      <UsersListRoutePage
        {...createUsersListRouteProps({
          adminUsers: createPagedUsers().slice(0, 10),
          adminUsersTotal: 12,
          onRefreshUsers
        })}
      />
    );

    await waitFor(() => {
      expect(onRefreshUsers).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        role: "all",
        search: "",
        status: "all"
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "第 2 页" }));

    await waitFor(() => {
      expect(onRefreshUsers).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 10,
        role: "all",
        search: "",
        status: "all"
      });
    });
  });

  it("opens a right-side drawer for the selected user with a flat username form", () => {
    renderUsersList({ adminQuota, selectedUser: adminUsers[1] });

    const drawerElement = screen.getByRole("dialog", { name: "修改用户" });
    const drawer = within(drawerElement);
    expect(drawerElement).toHaveClass("ui-overlay-drawer-sm");
    expect(drawer.getByDisplayValue("Member User")).toBeInTheDocument();
    expect(drawer.getByLabelText(/^用户名/).closest("form")).toHaveClass("users-flat-form");
    expect(drawer.getByLabelText(/^用户名/).closest("form")).not.toHaveClass("users-drawer-form");
    expect(drawer.getByDisplayValue("20")).toBeInTheDocument();
    expect(drawer.getByRole("button", { name: "保存修改" })).toHaveClass("ui-button-size-md");
    expect(drawer.getByRole("button", { name: "保存配额设置" })).toBeInTheDocument();
  });

  it("opens the row action menu and notifies the caller when edit is selected", async () => {
    const onOpenUserSettings = vi.fn();

    renderUsersList({ onOpenUserSettings });

    const menu = await openActionsForUser("admin@example.com", "Admin User 操作");
    expect(menu.getByRole("button", { name: "修改" })).toBeInTheDocument();
    expect(menu.getByRole("button", { name: "重置密码" })).toBeInTheDocument();
    expect(menu.getByRole("button", { name: "停用" })).toBeInTheDocument();
    expect(menu.getByRole("button", { name: "删除" })).toBeInTheDocument();

    fireEvent.click(menu.getByRole("button", { name: "修改" }));

    expect(onOpenUserSettings).toHaveBeenCalledWith("admin-1");
  });

  it("submits profile edits from the user drawer", async () => {
    const onCloseUserSettings = vi.fn();
    const onUpdateUser = vi.fn().mockResolvedValue(undefined);

    renderUsersList({
      adminQuota,
      onCloseUserSettings,
      onUpdateUser,
      selectedUser: adminUsers[1]
    });

    const drawer = within(screen.getByRole("dialog", { name: "修改用户" }));
    fireEvent.change(drawer.getByLabelText(/^用户名/), { target: { value: "Renamed User" } });
    fireEvent.click(drawer.getByRole("button", { name: "保存修改" }));

    await waitFor(() => {
      expect(onUpdateUser).toHaveBeenCalledWith("member-1", { name: "Renamed User" });
    });
    expect(onCloseUserSettings).toHaveBeenCalled();
  });

  it("runs password reset, status update, and delete actions from the action menu", async () => {
    const onResetUserPassword = vi.fn().mockResolvedValue(undefined);
    const onUpdateUserStatus = vi.fn().mockResolvedValue(undefined);
    const onDeleteUser = vi.fn().mockResolvedValue(undefined);

    renderUsersList({
      onDeleteUser,
      onResetUserPassword,
      onUpdateUserStatus
    });

    const resetMenu = await openActionsForUser("admin@example.com", "Admin User 操作");
    fireEvent.click(resetMenu.getByRole("button", { name: "重置密码" }));
    const resetDialog = within(screen.getByRole("dialog", { name: "重置密码" }));
    expect(resetDialog.getByLabelText(/^新密码/).closest("form")).toHaveClass("users-flat-form");
    expect(resetDialog.getByRole("button", { name: "确认重置" })).toHaveClass("ui-button-size-md");
    fireEvent.change(resetDialog.getByLabelText(/^新密码/), { target: { value: "newpassword123" } });
    fireEvent.click(resetDialog.getByRole("button", { name: "确认重置" }));
    await waitFor(() => {
      expect(onResetUserPassword).toHaveBeenCalledWith("admin-1", "newpassword123");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "重置密码" })).not.toBeInTheDocument();
    });

    const statusMenu = await openActionsForUser("member@example.com", "Member User 操作");
    fireEvent.click(statusMenu.getByRole("button", { name: "启用" }));
    const statusDialog = within(screen.getByRole("dialog", { name: "启用用户" }));
    fireEvent.click(statusDialog.getByRole("button", { name: "确认启用" }));
    await waitFor(() => {
      expect(onUpdateUserStatus).toHaveBeenCalledWith("member-1", "active");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "启用用户" })).not.toBeInTheDocument();
    });

    const deleteMenu = await openActionsForUser("member@example.com", "Member User 操作");
    fireEvent.click(deleteMenu.getByRole("button", { name: "删除" }));
    const deleteDialog = within(screen.getByRole("dialog", { name: "删除用户" }));
    fireEvent.click(deleteDialog.getByRole("button", { name: "确认删除" }));
    await waitFor(() => {
      expect(onDeleteUser).toHaveBeenCalledWith("member-1");
    });
  });

  it("protects the current user from disabling or deleting themselves", async () => {
    const onUpdateUserStatus = vi.fn().mockResolvedValue(undefined);
    const onDeleteUser = vi.fn().mockResolvedValue(undefined);

    renderUsersList({
      currentUserId: "admin-1",
      onDeleteUser,
      onUpdateUserStatus
    });

    const statusMenu = await openActionsForUser("admin@example.com", "Admin User 操作");
    fireEvent.click(statusMenu.getByRole("button", { name: "停用" }));
    const statusDialog = within(screen.getByRole("dialog", { name: "停用用户" }));
    expect(statusDialog.getByRole("alert")).toHaveTextContent("不能停用当前登录用户。");
    expect(statusDialog.getByRole("button", { name: "确认停用" })).toBeDisabled();
    fireEvent.click(statusDialog.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "停用用户" })).not.toBeInTheDocument();
    });

    const deleteMenu = await openActionsForUser("admin@example.com", "Admin User 操作");
    fireEvent.click(deleteMenu.getByRole("button", { name: "删除" }));
    const deleteDialog = within(screen.getByRole("dialog", { name: "删除用户" }));
    expect(deleteDialog.getByRole("alert")).toHaveTextContent("不能删除当前登录用户。");
    expect(deleteDialog.getByRole("button", { name: "确认删除" })).toBeDisabled();
    expect(onUpdateUserStatus).not.toHaveBeenCalled();
    expect(onDeleteUser).not.toHaveBeenCalled();
  });

  it("keeps destructive dialogs open and shows an error when an action fails", async () => {
    const onUpdateUserStatus = vi.fn().mockRejectedValue(new Error("Service unavailable"));
    const onDeleteUser = vi.fn().mockRejectedValue(new Error("Service unavailable"));

    renderUsersList({
      currentUserId: "other-user",
      onDeleteUser,
      onUpdateUserStatus
    });

    const statusMenu = await openActionsForUser("admin@example.com", "Admin User 操作");
    fireEvent.click(statusMenu.getByRole("button", { name: "停用" }));
    const statusDialog = within(screen.getByRole("dialog", { name: "停用用户" }));
    fireEvent.click(statusDialog.getByRole("button", { name: "确认停用" }));
    await waitFor(() => {
      expect(statusDialog.getByRole("alert")).toHaveTextContent("用户状态更新失败，请稍后重试。");
    });

    fireEvent.click(statusDialog.getByRole("button", { name: "取消" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "停用用户" })).not.toBeInTheDocument();
    });

    const deleteMenu = await openActionsForUser("member@example.com", "Member User 操作");
    fireEvent.click(deleteMenu.getByRole("button", { name: "删除" }));
    const deleteDialog = within(screen.getByRole("dialog", { name: "删除用户" }));
    fireEvent.click(deleteDialog.getByRole("button", { name: "确认删除" }));
    await waitFor(() => {
      expect(deleteDialog.getByRole("alert")).toHaveTextContent("用户删除失败，请稍后重试。");
    });
  });

  it("shows bulk actions after selecting users", () => {
    renderUsersList();

    fireEvent.click(screen.getByRole("checkbox", { name: "选择用户 admin@example.com" }));

    expect(screen.getByText("已选择 1 个用户")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量设为管理员" })).toHaveClass("ui-button-primary");
    expect(screen.getByRole("button", { name: "批量设为成员" })).toHaveClass("ui-button-secondary");
    expect(screen.getByRole("button", { name: "批量暂停外发" })).toHaveClass("ui-button-secondary");
  });

  it("opens a create user drawer and submits the typed payload", async () => {
    const onCreateUser = vi.fn();

    renderUsersList({ onCreateUser });

    fireEvent.click(screen.getByRole("button", { name: "新增用户" }));
    const drawer = within(screen.getByRole("dialog", { name: "新增用户" }));
    expect(drawer.getByLabelText(/^用户名/).closest("form")).toHaveClass("users-flat-form");
    expect(drawer.getByRole("button", { name: "创建用户" })).toHaveClass("ui-button-size-md");
    fireEvent.change(drawer.getByLabelText(/^用户名/), { target: { value: "New User" } });
    fireEvent.change(drawer.getByLabelText(/^邮箱/), { target: { value: "new.user@example.com" } });
    fireEvent.change(drawer.getByLabelText(/^初始密码/), { target: { value: "password123" } });
    fireEvent.click(drawer.getByRole("combobox", { name: /^角色/ }));
    fireEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "管理员" }));
    fireEvent.click(drawer.getByRole("button", { name: "创建用户" }));

    expect(onCreateUser).toHaveBeenCalledWith({
      email: "new.user@example.com",
      name: "New User",
      password: "password123",
      role: "admin"
    });
  });

  it("runs bulk actions through the provided API callbacks", async () => {
    const onBulkChangeRole = vi.fn();
    const onBulkSuspendOutbound = vi.fn();

    renderUsersList({
      onBulkChangeRole,
      onBulkSuspendOutbound
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "选择用户 member@example.com" }));
    fireEvent.click(screen.getByRole("button", { name: "批量设为管理员" }));
    await waitFor(() => {
      expect(onBulkChangeRole).toHaveBeenCalledWith(["member-1"], "admin");
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "选择用户 member@example.com" }));
    fireEvent.click(screen.getByRole("button", { name: "批量暂停外发" }));

    await waitFor(() => {
      expect(onBulkSuspendOutbound).toHaveBeenCalledWith(["member-1"]);
    });
  });
});
