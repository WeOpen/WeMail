import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuotaSummary, UserSummary } from "@wemail/shared";

import { UsersListPage } from "../pages/UsersListPage";

const adminUsers: UserSummary[] = [
  { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
  { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
];

const adminQuota: QuotaSummary = {
  userId: "member-1",
  dailyLimit: 20,
  sendsToday: 8,
  disabled: false,
  updatedAt: "2026-04-10T00:00:00.000Z"
};

describe("UsersListPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the directory-style users list with search and filter controls", () => {
    render(
      <UsersListPage
        adminQuota={null}
        adminUsers={adminUsers}
        onCloseUserSettings={vi.fn()}
        onOpenUserSettings={vi.fn()}
        onRoleFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSubmitQuota={vi.fn()}
        roleFilter="all"
        searchValue=""
        selectedUser={null}
        statusFilter="all"
      />
    );

    expect(screen.getByText("用户中心")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "管理成员目录" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出" })).toHaveClass("ui-button-primary");
    expect(screen.getByRole("table")).toHaveClass("ui-table");
    expect(screen.getByRole("columnheader", { name: "用户" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "邮箱" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "角色" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "操作" })).toHaveClass("ui-table-sticky-end");
    expect(screen.getByRole("checkbox", { name: "选择全部用户" }).closest("th")).toHaveClass("ui-table-sticky-start");
    expect(screen.getAllByText("正常").find((element) => element.classList.contains("accounts-status-pill"))).toHaveClass(
      "accounts-status-pill",
      "accounts-status-pill--enabled"
    );
    expect(screen.getByLabelText("搜索用户")).toBeInTheDocument();
    expect(screen.getByLabelText("角色筛选")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
  });

  it("filters the visible rows based on search and role props", () => {
    const { rerender } = render(
      <UsersListPage
        adminQuota={null}
        adminUsers={adminUsers}
        onCloseUserSettings={vi.fn()}
        onOpenUserSettings={vi.fn()}
        onRoleFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSubmitQuota={vi.fn()}
        roleFilter="all"
        searchValue="member"
        selectedUser={null}
        statusFilter="all"
      />
    );

    expect(screen.queryByText("admin@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();

    rerender(
      <UsersListPage
        adminQuota={null}
        adminUsers={adminUsers}
        onCloseUserSettings={vi.fn()}
        onOpenUserSettings={vi.fn()}
        onRoleFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSubmitQuota={vi.fn()}
        roleFilter="admin"
        searchValue=""
        selectedUser={null}
        statusFilter="all"
      />
    );

    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.queryByText("member@example.com")).not.toBeInTheDocument();
  });

  it("opens a right-side drawer for the selected user", () => {
    render(
      <UsersListPage
        adminQuota={adminQuota}
        adminUsers={adminUsers}
        onCloseUserSettings={vi.fn()}
        onOpenUserSettings={vi.fn()}
        onRoleFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSubmitQuota={vi.fn()}
        roleFilter="all"
        searchValue=""
        selectedUser={adminUsers[1]}
        statusFilter="all"
      />
    );

    expect(screen.getByRole("dialog", { name: "用户设置" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存用户设置" })).toBeInTheDocument();
  });

  it("notifies the caller when a row action is clicked", () => {
    const onOpenUserSettings = vi.fn();

    render(
      <UsersListPage
        adminQuota={null}
        adminUsers={adminUsers}
        onCloseUserSettings={vi.fn()}
        onOpenUserSettings={onOpenUserSettings}
        onRoleFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSubmitQuota={vi.fn()}
        roleFilter="all"
        searchValue=""
        selectedUser={null}
        statusFilter="all"
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "查看设置" })[0]);
    expect(onOpenUserSettings).toHaveBeenCalledWith("admin-1");
  });

  it("shows bulk actions after selecting users", () => {
    render(
      <UsersListPage
        adminQuota={null}
        adminUsers={adminUsers}
        onCloseUserSettings={vi.fn()}
        onOpenUserSettings={vi.fn()}
        onRoleFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSubmitQuota={vi.fn()}
        roleFilter="all"
        searchValue=""
        selectedUser={null}
        statusFilter="all"
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "选择用户 admin@example.com" }));

    expect(screen.getByText("已选择 1 个用户")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量设为管理员" })).toHaveClass("ui-button-primary");
    expect(screen.getByRole("button", { name: "批量设为成员" })).toHaveClass("ui-button-secondary");
    expect(screen.getByRole("button", { name: "批量暂停外发" })).toHaveClass("ui-button-secondary");
  });
});
