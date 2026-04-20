import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AccountsListPage } from "../../features/accounts/AccountsListPage";
import { AccountsSettingsPage } from "../../features/accounts/AccountsSettingsPage";

function renderWithRouter(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

function getAccountRow(address: string) {
  return screen.getByText(address).closest("tr");
}

describe("accounts pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the mailbox account list table shell instead of the old placeholder", () => {
    renderWithRouter(<AccountsListPage />);

    expect(screen.getByRole("heading", { name: "账号列表" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索 ID / 地址 / 标签 / 创建人")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅看异常" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅看长期不活跃" })).toBeInTheDocument();
    expect(screen.getByLabelText("最近活跃筛选")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "地址" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "邮件数量" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "操作" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "选择全部账号" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(3);
    expect(screen.queryByText("账号列表先以占位页承接")).not.toBeInTheDocument();
  });

  it("keeps soft-deleted rows visible and requires an exact phrase before hard delete removes them", async () => {
    const user = userEvent.setup();

    renderWithRouter(<AccountsListPage />);

    await user.click(screen.getByRole("checkbox", { name: "选择账号 ops@wemail.ai" }));
    await user.click(screen.getByRole("checkbox", { name: "选择账号 growth@wemail.ai" }));

    expect(screen.getByText("已选择 2 个账号")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量启用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量停用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "批量归档" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "更多操作" }));
    await user.click(screen.getByRole("button", { name: "批量软删除" }));

    const opsRowAfterSoftDelete = getAccountRow("ops@wemail.ai");
    const growthRowAfterSoftDelete = getAccountRow("growth@wemail.ai");

    expect(opsRowAfterSoftDelete).not.toBeNull();
    expect(growthRowAfterSoftDelete).not.toBeNull();
    expect(within(opsRowAfterSoftDelete!).getByText("已软删除")).toBeInTheDocument();
    expect(within(growthRowAfterSoftDelete!).getByText("已软删除")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "选择账号 ops@wemail.ai" }));
    await user.click(screen.getByRole("checkbox", { name: "选择账号 growth@wemail.ai" }));
    await user.click(screen.getByRole("button", { name: "更多操作" }));
    await user.click(screen.getByRole("button", { name: "批量彻底删除" }));

    const dialog = screen.getByRole("dialog", { name: "确认彻底删除" });
    expect(within(dialog).getByText("DELETE 2 ACCOUNTS")).toBeInTheDocument();

    const confirmationInput = within(dialog).getByLabelText("确认词");
    const confirmButton = within(dialog).getByRole("button", { name: "确认彻底删除" });

    expect(confirmButton).toBeDisabled();

    await user.type(confirmationInput, "DELETE 2 ACCOUNTS");

    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(screen.queryByText("ops@wemail.ai")).not.toBeInTheDocument();
    expect(screen.queryByText("growth@wemail.ai")).not.toBeInTheDocument();
    expect(screen.getByText("archive@wemail.ai")).toBeInTheDocument();
  });

  it("renders the global mailbox-account settings center with independent save controls", async () => {
    const user = userEvent.setup();

    renderWithRouter(<AccountsSettingsPage />);

    expect(screen.getByRole("heading", { name: "账号设置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "默认创建规则" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "生命周期规则" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "批量操作保护" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "当前策略摘要" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存默认创建规则" }));

    expect(screen.getByText("默认创建规则已保存")).toBeInTheDocument();

    const allowHardDeleteCheckbox = screen.getByLabelText("允许彻底删除");

    await user.click(allowHardDeleteCheckbox);
    await user.click(screen.getByRole("button", { name: "保存生命周期规则" }));

    const dialog = screen.getByRole("dialog", { name: "确认危险策略变更" });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    expect(allowHardDeleteCheckbox).not.toBeChecked();
  });
});
