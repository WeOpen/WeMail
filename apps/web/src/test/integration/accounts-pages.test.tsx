import { useState, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { MailDomainSummary, MailboxDetail } from "@wemail/shared";

import { AccountsListPage } from "../../features/accounts/AccountsListPage";
import { AccountsListRoutePage } from "../../features/accounts/AccountsListRoutePage";
import { AccountsSettingsPage } from "../../features/accounts/AccountsSettingsPage";

type AccountsQuickFilter = "none" | "anomaly" | "inactive";

function renderWithRouter(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

const mockAccounts: MailboxDetail[] = [
  {
    id: "acct_1001",
    address: "ops@wemail.ai",
    label: "ops",
    status: "enabled",
    tags: [],
    createdBy: "user_1",
    createdByName: "Will",
    lastActiveAt: "2026-04-18T15:12:00Z",
    deletedAt: null,
    messageCount: 1240,
    outboundCount: 186,
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "acct_1002",
    address: "growth@wemail.ai",
    label: "growth",
    status: "disabled",
    tags: [],
    createdBy: "user_2",
    createdByName: "Ada",
    lastActiveAt: "2026-04-16T00:20:00Z",
    deletedAt: null,
    messageCount: 842,
    outboundCount: 93,
    createdAt: "2026-02-19T00:00:00Z"
  },
  {
    id: "acct_1003",
    address: "archive@wemail.ai",
    label: "archive",
    status: "archived",
    tags: [],
    createdBy: null,
    createdByName: "System",
    lastActiveAt: "2026-03-28T09:05:00Z",
    deletedAt: null,
    messageCount: 365,
    outboundCount: 24,
    createdAt: "2026-01-09T00:00:00Z"
  }
];

const mockAccountDomains: MailDomainSummary[] = [
  { domain: "wemail.ai", allowedRoles: [] },
  { domain: "ops.example.com", allowedRoles: ["admin"] }
];

const mockAccountPolicy = {
  creation: {
    defaultTagsEnabled: true,
    defaultTags: "真实标签, 运营",
    allowCreationOverride: true,
    defaultStatus: "enabled",
    requireCreatorNote: false
  },
  lifecycle: {
    inactiveDays: 30,
    inactiveAction: "archive",
    softDeleteRetentionDays: 30,
    allowHardDelete: false,
    requireSoftDeleteBeforeHardDelete: true
  },
  protection: {
    confirmStandardBulkActions: true,
    standardBulkLimit: 100,
    requireDangerPhrase: true,
    hardDeleteLimit: 20,
    auditLoggingEnabled: true
  },
  lastUpdatedLabel: "2026-04-20T00:00:00.000Z"
};

describe("accounts pages", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the mailbox account list table shell instead of the old placeholder", () => {
    renderWithRouter(
      <AccountsListPage
        accounts={mockAccounts}
        activeRange="all"
        availableDomains={mockAccountDomains}
        isLoadingDomains={false}
        isLoading={false}
        onActiveRangeChange={vi.fn()}
        onBulkDeleteAccounts={vi.fn()}
        onCreateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
        onExportAccounts={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onUpdateAccount={vi.fn()}
        page={1}
        pageSize={10}
        quickFilter="none"
        searchValue=""
        statusFilter="all"
        total={3}
      />
    );

    expect(screen.getAllByText("账号列表").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "批量管理表格壳层" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索地址或创建人")).toBeInTheDocument();
    const headerActions = screen.getByText("账号中心").closest("section")!.querySelector(".workspace-topbar-actions");
    expect(headerActions).not.toBeNull();
    expect(within(headerActions as HTMLElement).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "刷新",
      "导出"
    ]);
    expect(screen.getByRole("button", { name: "导出" })).toHaveClass("ui-button-primary");
    expect(screen.getByRole("button", { name: "刷新" })).toHaveClass("ui-button-secondary");
    expect(screen.getByRole("button", { name: "导出" }).querySelector(".ui-button-icon-slot")).not.toBeNull();
    expect(screen.getByRole("button", { name: "刷新" }).querySelector(".ui-button-icon-slot")).not.toBeNull();
    expect(screen.getByRole("button", { name: "仅看异常" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仅看长期不活跃" })).toBeInTheDocument();
    expect(screen.queryByLabelText("标签筛选")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("创建人筛选")).not.toBeInTheDocument();
    expect(screen.queryByText("全部创建人")).not.toBeInTheDocument();
    expect(screen.getByLabelText("最近活跃筛选")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "ID" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "地址" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "标签" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "邮件数量" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "操作" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "操作" })).toHaveClass("ui-table-sticky-end");
    expect(screen.getByRole("checkbox", { name: "选择全部账号" }).closest("th")).toHaveClass("ui-table-sticky-start");
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "操作" })).toHaveLength(3);
    expect(screen.getByRole("combobox", { name: "每页条数" })).toHaveTextContent("10");
    expect(screen.queryByText("账号列表先以占位页承接")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建账号" }).querySelector(".ui-button-icon-slot")).not.toBeNull();
  });

  it("requires a configured domain selection when creating an account", async () => {
    const user = userEvent.setup();
    const onCreateAccount = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <AccountsListPage
        accounts={mockAccounts}
        activeRange="all"
        availableDomains={mockAccountDomains}
        isLoading={false}
        isLoadingDomains={false}
        onActiveRangeChange={vi.fn()}
        onBulkDeleteAccounts={vi.fn()}
        onCreateAccount={onCreateAccount}
        onDeleteAccount={vi.fn()}
        onExportAccounts={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onUpdateAccount={vi.fn()}
        page={1}
        pageSize={10}
        quickFilter="none"
        searchValue=""
        statusFilter="all"
        total={3}
      />
    );

    await user.click(screen.getByRole("button", { name: "新建账号" }));

    const dialog = screen.getByRole("dialog", { name: "创建新账号" });
    const labelInput = within(dialog).getByLabelText("账号标签");
    const domainSelect = within(dialog).getByRole("combobox", { name: "邮箱域名" });
    const createButton = within(dialog).getByRole("button", { name: "创建账号" });

    expect(createButton).toBeDisabled();

    await user.type(labelInput, "ops");

    expect(createButton).toBeDisabled();

    await user.click(domainSelect);
    await user.click(within(await screen.findByRole("listbox", { name: "邮箱域名" })).getByRole("option", { name: "wemail.ai" }));

    expect(createButton).toBeEnabled();

    await user.click(createButton);

    expect(onCreateAccount).toHaveBeenCalledWith({
      label: "ops",
      domain: "wemail.ai"
    });
  });

  it("loads configured account domains and posts the selected domain when creating through the route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/accounts/domains")) {
        return new Response(
          JSON.stringify({
            domains: mockAccountDomains,
            primaryDomain: "wemail.ai"
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200
          }
        );
      }

      if (url.includes("/api/accounts/list?")) {
        return new Response(JSON.stringify({ accounts: [], total: 0 }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      if (url.endsWith("/api/accounts") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            mailbox: {
              id: "acct-created",
              address: "support@ops.example.com",
              label: "support",
              createdAt: "2026-04-20T00:00:00.000Z"
            }
          }),
          {
            headers: { "content-type": "application/json" },
            status: 201
          }
        );
      }

      return new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
        status: 404
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<AccountsListRoutePage />);

    await user.click(await screen.findByRole("button", { name: "新建账号" }));

    const dialog = screen.getByRole("dialog", { name: "创建新账号" });
    await user.type(within(dialog).getByLabelText("账号标签"), "support");
    await user.click(within(dialog).getByRole("combobox", { name: "邮箱域名" }));
    await user.click(within(await screen.findByRole("listbox", { name: "邮箱域名" })).getByRole("option", { name: "ops.example.com" }));
    await user.click(within(dialog).getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(([input, init]) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        return url.endsWith("/api/accounts") && init?.method === "POST";
      });

      expect(createCall).toBeDefined();
      expect(createCall?.[1]?.body).toBe(JSON.stringify({ label: "support", domain: "ops.example.com" }));
    });
  });

  it("shows selected state on account quick filters when toggled", async () => {
    const user = userEvent.setup();

    function StatefulAccountsList() {
      const [quickFilter, setQuickFilter] = useState<AccountsQuickFilter>("none");

      return (
        <AccountsListPage
          accounts={mockAccounts}
          activeRange="all"
          availableDomains={mockAccountDomains}
          isLoadingDomains={false}
          isLoading={false}
          onActiveRangeChange={vi.fn()}
          onBulkDeleteAccounts={vi.fn()}
          onCreateAccount={vi.fn()}
          onDeleteAccount={vi.fn()}
          onExportAccounts={vi.fn()}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          onQuickFilterChange={setQuickFilter}
          onRefresh={vi.fn()}
          onSearchChange={vi.fn()}
          onStatusFilterChange={vi.fn()}
          onUpdateAccount={vi.fn()}
          page={1}
          pageSize={10}
          quickFilter={quickFilter}
          searchValue=""
          statusFilter="all"
          total={3}
        />
      );
    }

    renderWithRouter(<StatefulAccountsList />);

    const anomalyButton = screen.getByRole("button", { name: "仅看异常" });
    const inactiveButton = screen.getByRole("button", { name: "仅看长期不活跃" });

    expect(anomalyButton).toHaveAttribute("aria-pressed", "false");
    expect(inactiveButton).toHaveAttribute("aria-pressed", "false");

    await user.click(anomalyButton);

    expect(anomalyButton).toHaveAttribute("aria-pressed", "true");
    expect(anomalyButton).toHaveClass("is-active");
    expect(inactiveButton).toHaveAttribute("aria-pressed", "false");

    await user.click(inactiveButton);

    expect(anomalyButton).toHaveAttribute("aria-pressed", "false");
    expect(inactiveButton).toHaveAttribute("aria-pressed", "true");
    expect(inactiveButton).toHaveClass("is-active");
  });

  it("changes the recent activity filter from the custom select", async () => {
    const user = userEvent.setup();
    const onActiveRangeChange = vi.fn();

    renderWithRouter(
      <AccountsListPage
        accounts={mockAccounts}
        activeRange="all"
        availableDomains={mockAccountDomains}
        isLoadingDomains={false}
        isLoading={false}
        onActiveRangeChange={onActiveRangeChange}
        onBulkDeleteAccounts={vi.fn()}
        onCreateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
        onExportAccounts={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onUpdateAccount={vi.fn()}
        page={1}
        pageSize={10}
        quickFilter="none"
        searchValue=""
        statusFilter="all"
        total={3}
      />
    );

    await user.click(screen.getByRole("combobox", { name: "最近活跃筛选" }));
    await user.click(within(await screen.findByRole("listbox", { name: "最近活跃筛选" })).getByRole("option", { name: "近 30 天" }));

    expect(onActiveRangeChange).toHaveBeenCalledWith("30d");
  });

  it("opens account row actions from a dropdown and runs account mutations", async () => {
    const user = userEvent.setup();
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    const onUpdateAccount = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <AccountsListPage
        accounts={mockAccounts}
        activeRange="all"
        availableDomains={mockAccountDomains}
        isLoadingDomains={false}
        isLoading={false}
        onActiveRangeChange={vi.fn()}
        onBulkDeleteAccounts={vi.fn()}
        onCreateAccount={vi.fn()}
        onDeleteAccount={onDeleteAccount}
        onExportAccounts={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onUpdateAccount={onUpdateAccount}
        page={1}
        pageSize={10}
        quickFilter="none"
        searchValue=""
        statusFilter="all"
        total={3}
      />
    );

    const row = screen.getByText("ops@wemail.ai").closest("tr");
    expect(row).not.toBeNull();

    await user.click(within(row!).getByRole("button", { name: "操作" }));

    const menu = within(await screen.findByRole("dialog", { name: "ops@wemail.ai 操作" }));
    expect(menu.getByRole("button", { name: "修改" })).toBeInTheDocument();
    expect(menu.getByRole("button", { name: "停用" })).toBeInTheDocument();
    expect(menu.getByRole("button", { name: "删除" })).toBeInTheDocument();

    await user.click(menu.getByRole("button", { name: "停用" }));
    expect(onUpdateAccount).toHaveBeenCalledWith("acct_1001", { status: "disabled" });

    await user.click(within(row!).getByRole("button", { name: "操作" }));
    await user.click(within(await screen.findByRole("dialog", { name: "ops@wemail.ai 操作" })).getByRole("button", { name: "删除" }));
    await user.click(within(screen.getByRole("dialog", { name: "删除账号" })).getByRole("button", { name: "确认删除" }));

    expect(onDeleteAccount).toHaveBeenCalledWith("acct_1001");
  });

  it("keeps soft-deleted rows visible and calls real deletion after exact hard-delete confirmation", async () => {
    const user = userEvent.setup();
    const onBulkDeleteAccounts = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <AccountsListPage
        accounts={mockAccounts}
        activeRange="all"
        availableDomains={mockAccountDomains}
        isLoadingDomains={false}
        isLoading={false}
        onActiveRangeChange={vi.fn()}
        onBulkDeleteAccounts={onBulkDeleteAccounts}
        onCreateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
        onExportAccounts={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onUpdateAccount={vi.fn()}
        page={1}
        pageSize={10}
        quickFilter="none"
        searchValue=""
        statusFilter="all"
        total={3}
      />
    );

    await user.click(screen.getByRole("checkbox", { name: "选择账号 ops@wemail.ai" }));
    await user.click(screen.getByRole("checkbox", { name: "选择账号 growth@wemail.ai" }));

    expect(screen.getByText("已选择 2 个账号")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更多操作" })).toBeInTheDocument();

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

    expect(onBulkDeleteAccounts).toHaveBeenCalledWith(["acct_1001", "acct_1002"]);
    expect(screen.queryByText("已选择 2 个账号")).not.toBeInTheDocument();
  });

  it("uses the backend bulk-delete endpoint for route-level hard deletion", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/accounts/domains")) {
        return new Response(
          JSON.stringify({
            domains: mockAccountDomains,
            primaryDomain: "wemail.ai"
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200
          }
        );
      }

      if (url.includes("/api/accounts/list?")) {
        return new Response(JSON.stringify({ accounts: mockAccounts, total: mockAccounts.length }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      if (url.endsWith("/api/accounts/bulk-delete") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true, deleted: 2 }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
        status: 404
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<AccountsListRoutePage />);

    await screen.findByText("ops@wemail.ai");
    await user.click(screen.getByRole("checkbox", { name: "选择账号 ops@wemail.ai" }));
    await user.click(screen.getByRole("checkbox", { name: "选择账号 growth@wemail.ai" }));
    await user.click(screen.getByRole("button", { name: "更多操作" }));
    await user.click(screen.getByRole("button", { name: "批量彻底删除" }));

    const dialog = screen.getByRole("dialog", { name: "确认彻底删除" });
    await user.type(within(dialog).getByLabelText("确认词"), "DELETE 2 ACCOUNTS");
    await user.click(within(dialog).getByRole("button", { name: "确认彻底删除" }));

    await waitFor(() => {
      const bulkDeleteCall = fetchMock.mock.calls.find(([input, init]) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        return url.endsWith("/api/accounts/bulk-delete") && init?.method === "POST";
      });

      expect(bulkDeleteCall).toBeDefined();
      expect(bulkDeleteCall?.[1]?.body).toBe(
        JSON.stringify({
          accountIds: ["acct_1001", "acct_1002"],
          mode: "hard",
          confirmationPhrase: "DELETE 2 ACCOUNTS"
        })
      );
    });
  });

  it("opens the bulk more-actions menu in a popover layer", async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <AccountsListPage
        accounts={mockAccounts}
        activeRange="all"
        availableDomains={mockAccountDomains}
        isLoadingDomains={false}
        isLoading={false}
        onActiveRangeChange={vi.fn()}
        onBulkDeleteAccounts={vi.fn()}
        onCreateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
        onExportAccounts={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onRefresh={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onUpdateAccount={vi.fn()}
        page={1}
        pageSize={10}
        quickFilter="none"
        searchValue=""
        statusFilter="all"
        total={3}
      />
    );

    await user.click(screen.getByRole("checkbox", { name: "选择全部账号" }));
    await user.click(screen.getByRole("button", { name: "更多操作" }));

    const menu = await screen.findByRole("dialog", { name: "危险批量操作" });
    expect(menu).toHaveClass("accounts-list-more-actions");
    expect(menu.closest(".accounts-list-bulk-bar")).toBeNull();
  });

  it("exports all filtered accounts instead of only the current page", async () => {
    const user = userEvent.setup();
    const currentPagePayload = { accounts: [mockAccounts[0]], total: 503 };
    const exportPageOneAccounts = Array.from({ length: 500 }, (_, index) => ({
      ...mockAccounts[0],
      id: `export-${index}`,
      address: `export-${index}@wemail.ai`
    }));
    const exportPageTwoAccounts = mockAccounts;
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/accounts/domains")) {
        return new Response(
          JSON.stringify({
            domains: mockAccountDomains,
            primaryDomain: "wemail.ai"
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200
          }
        );
      }

      if (url.includes("/api/accounts/list?") && url.includes("page=1&pageSize=500")) {
        return new Response(JSON.stringify({ accounts: exportPageOneAccounts, total: 503 }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      if (url.includes("/api/accounts/list?") && url.includes("page=2&pageSize=500")) {
        return new Response(JSON.stringify({ accounts: exportPageTwoAccounts, total: 503 }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      if (url.includes("/api/accounts/list?")) {
        return new Response(JSON.stringify(currentPagePayload), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
        status: 404
      });
    });

    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:wemail-accounts")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    renderWithRouter(<AccountsListRoutePage />);

    await screen.findByText("ops@wemail.ai");
    await user.click(screen.getByRole("button", { name: "导出" }));

    await waitFor(() => {
      const listCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/api/accounts/list?"));
      expect(listCalls).toHaveLength(3);
    });
    const listCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes("/api/accounts/list?"));
    expect(String(listCalls[1][0])).toContain("page=1&pageSize=500");
    expect(String(listCalls[2][0])).toContain("page=2&pageSize=500");
  });

  it("renders the global mailbox-account settings center with independent save controls", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/accounts/settings") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ policy: mockAccountPolicy }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      if (url.endsWith("/api/accounts/settings") && init?.method === "PUT") {
        return new Response(JSON.stringify({ policy: mockAccountPolicy }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
        status: 404
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<AccountsSettingsPage />);

    expect(screen.getByRole("heading", { name: "账号策略中心" })).toBeInTheDocument();
    expect(screen.getByLabelText("账号设置概览")).toHaveClass("accounts-settings-overview-panel");
    expect(screen.getByLabelText("账号设置关键指标")).toHaveClass("accounts-settings-metric-grid");
    expect(screen.getByRole("heading", { name: "默认创建规则" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "生命周期规则" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "批量操作保护" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "策略运行状态" })).toBeInTheDocument();
    expect(screen.queryByText(/mock-first/i)).not.toBeInTheDocument();
    expect(await screen.findByDisplayValue("真实标签, 运营")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "自动附加默认标签" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "危险操作要求确认词" })).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("button", { name: "保存默认创建规则" }));

    expect(screen.getByText("默认创建规则已保存")).toBeInTheDocument();

    const allowHardDeleteCheckbox = screen.getByRole("switch", { name: "允许彻底删除" });

    await user.click(allowHardDeleteCheckbox);
    await user.click(screen.getByRole("button", { name: "保存生命周期规则" }));

    const dialog = screen.getByRole("dialog", { name: "确认危险策略变更" });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    expect(allowHardDeleteCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("keeps account settings dirty and shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/accounts/settings") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ policy: mockAccountPolicy }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      if (url.endsWith("/api/accounts/settings") && init?.method === "PUT") {
        return new Response(JSON.stringify({ error: "validation failed" }), {
          headers: { "content-type": "application/json" },
          status: 400
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
        status: 404
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<AccountsSettingsPage />);

    await screen.findByDisplayValue("真实标签, 运营");
    await user.click(screen.getByRole("button", { name: "保存默认创建规则" }));

    expect(await screen.findByText("账号策略保存失败")).toBeInTheDocument();
    expect(screen.queryByText("默认创建规则已保存")).not.toBeInTheDocument();
  });
});
