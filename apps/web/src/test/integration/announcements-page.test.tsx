import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { AnnouncementsPage } from "../../pages/AnnouncementsPage";
import { jsonResponse } from "../helpers/mock-api";

const announcementFixtures = [
  {
    id: "ann-1",
    title: "核心平台升级窗口",
    summary: "本周六凌晨将进行核心平台升级，期间管理端会短暂只读。",
    type: "维护通知",
    status: "即将开始",
    audience: "全部成员",
    priority: "高",
    author: "admin@example.com",
    tags: ["维护", "平台"],
    pinned: true,
    startAt: null,
    endAt: null,
    acknowledgedAt: null,
    receiptStatus: "未签收",
    receiptSummary: { signed: 0, unsigned: 2 },
    publishedAt: "2026-06-14T09:00:00.000Z",
    updatedAt: "2026-06-14T09:00:00.000Z"
  },
  {
    id: "ann-2",
    title: "发件箱策略更新",
    summary: "发件箱新增发送失败复查和通知目标选择能力。",
    type: "产品更新",
    status: "已发布",
    audience: "管理员",
    priority: "中",
    author: "ops@example.com",
    tags: ["发件箱"],
    pinned: true,
    startAt: null,
    endAt: null,
    acknowledgedAt: "2026-06-14T10:00:00.000Z",
    receiptStatus: "已签收",
    receiptSummary: { signed: 1, unsigned: 1 },
    publishedAt: "2026-06-13T18:30:00.000Z",
    updatedAt: "2026-06-13T18:30:00.000Z"
  },
  {
    id: "ann-3",
    title: "邮箱接收策略说明",
    summary: "未匹配账号邮件会进入管理员可见列表，便于排查路由问题。",
    type: "运营通知",
    status: "已发布",
    audience: "管理员",
    priority: "中",
    author: "admin@example.com",
    tags: ["邮件"],
    pinned: false,
    startAt: null,
    endAt: null,
    acknowledgedAt: null,
    receiptStatus: "未签收",
    receiptSummary: { signed: 0, unsigned: 2 },
    publishedAt: "2026-06-12T08:00:00.000Z",
    updatedAt: "2026-06-12T08:00:00.000Z"
  },
  {
    id: "ann-4",
    title: "API 密钥安全提示",
    summary: "建议定期轮换 API 密钥，并关闭不再使用的凭证。",
    type: "安全提醒",
    status: "已发布",
    audience: "全部成员",
    priority: "低",
    author: "security@example.com",
    tags: ["安全"],
    pinned: false,
    startAt: null,
    endAt: null,
    acknowledgedAt: null,
    receiptStatus: "未签收",
    receiptSummary: { signed: 0, unsigned: 2 },
    publishedAt: "2026-06-11T10:00:00.000Z",
    updatedAt: "2026-06-11T10:00:00.000Z"
  }
];

describe("announcements integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({}));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.history.pushState({}, "", "/");
  });

  it(
    "renders the announcements board for members without the publish button",
    async () => {
      const user = userEvent.setup();
      window.history.pushState({}, "", "/announcements");
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/accounts")) {
          return jsonResponse({
            mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/api/mail/messages?accountId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/mail/outbound?accountId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        if (url.endsWith("/api/users")) {
          return jsonResponse({
            users: [{ id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.includes("/api/users/invites")) return jsonResponse({ invites: [] });
        if (url.includes("/api/system/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (/\/api\/users\/[^/]+\/quota/.test(url)) {
          return jsonResponse({
            quota: {
              userId: "admin-1",
              dailyLimit: 20,
              sendsToday: 0,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.includes("/api/users/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.includes("/api/announcements")) {
          return jsonResponse({
            announcements: announcementFixtures,
            page: 1,
            pageSize: 4,
            total: announcementFixtures.length
          });
        }

        return jsonResponse({});
      });

      render(<App />);

      const loginDialog = await screen.findByRole("dialog", { name: "公告提醒" });
      await user.click(within(loginDialog).getByRole("button", { name: "我知道了" }));

      const searchbox = await screen.findByRole("searchbox", { name: /公告搜索/i });
      expect(searchbox).toBeInTheDocument();
      expect(searchbox).toHaveClass("form-control");
      screen.getAllByRole("combobox").forEach((select) => {
        expect(select).toHaveClass("form-control", "form-select");
      });
      expect(screen.queryByRole("button", { name: /发布公告/i })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/最近公告筛选/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/公告控制条/i)).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^即将开始$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^已发布$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: /核心平台升级窗口/i })).toBeInTheDocument();
      expect(screen.getByText(/^最近公告$/i)).toBeInTheDocument();
      expect(screen.getByText(/^概览$/i)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /公告状态分布/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/当前对成员可见|24h 内计划公告|待归档复盘|历史公告沉淀/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^时间线$/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /状态概览/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /近期维护窗口/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/公告页面已预留/i)).not.toBeInTheDocument();
    },
    10000
  );

  it(
    "shows the publish announcement button for admins",
    async () => {
      render(<AnnouncementsPage canPublish />);

      expect(await screen.findByRole("button", { name: /发布公告/i })).toBeInTheDocument();
    },
    10000
  );

  it("uses backend announcements with an automatic pinned carousel, pinned chips, and paginated list", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.includes("/api/announcements")) {
        return jsonResponse({
          announcements: announcementFixtures,
          summary: [{ label: "进行中", value: 3 }],
          page: 1,
          pageSize: 4,
          total: 8
        });
      }

      return jsonResponse({});
    });

    const { container } = render(<AnnouncementsPage />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { level: 1, name: "核心平台升级窗口" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /4 月核心平台升级/i })).not.toBeInTheDocument();

    const overviewRows = Array.from(container.querySelectorAll(".announcements-overview-legend .announcements-overview-row"));
    expect(overviewRows).toHaveLength(5);
    expect(overviewRows.find((row) => row.textContent?.includes("已发布"))).toHaveTextContent("0 条");
    expect(overviewRows.find((row) => row.textContent?.includes("进行中"))).toHaveTextContent("3 条");
    expect(overviewRows.find((row) => row.textContent?.includes("即将开始"))).toHaveTextContent("0 条");
    expect(overviewRows.find((row) => row.textContent?.includes("已结束"))).toHaveTextContent("0 条");
    expect(overviewRows.find((row) => row.textContent?.includes("已归档"))).toHaveTextContent("0 条");

    const carouselRail = screen.getByRole("tablist", { name: "置顶公告轮播" });
    expect(carouselRail).toHaveClass("announcements-carousel-rail");
    expect(carouselRail).toHaveStyle({ "--announcements-carousel-duration": "5000ms" });
    expect(within(carouselRail).getAllByRole("tab")).toHaveLength(2);
    expect(container.querySelector(".announcements-pinned-vertical-copy")).not.toBeInTheDocument();
    expect(container.querySelector(".announcements-carousel-step[data-state=\"active\"]")).toBeInTheDocument();
    expect(
      container.querySelector(".announcements-carousel-step[data-state=\"active\"] .announcements-carousel-step-fill")
    ).toBeInTheDocument();
    expect(container.querySelector(".announcements-hero-copy")?.getAttribute("data-carousel-index")).toBe("0");

    act(() => {
      vi.advanceTimersByTime(5200);
    });
    expect(screen.getByRole("heading", { level: 1, name: "发件箱策略更新" })).toBeInTheDocument();
    expect(container.querySelector(".announcements-hero-copy")?.getAttribute("data-carousel-index")).toBe("1");

    const listItems = container.querySelectorAll(".announcements-timeline .announcements-item");
    expect(listItems[0]).toHaveTextContent("核心平台升级窗口");
    expect(listItems[0]).toHaveTextContent("已置顶");

    const pagination = screen.getByRole("navigation", { name: "公告列表分页" });
    expect(pagination).toHaveClass("users-list-pagination");
    expect(within(pagination).getByText("共 8 条")).toBeInTheDocument();
    act(() => {
      vi.useRealTimers();
    });
    const user = userEvent.setup();
    await user.click(within(pagination).getByRole("button", { name: "下一页" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/announcements?page=2&pageSize=4"), expect.anything());
    });
  });

  it("sends filters to the announcements API and refreshes server data after publishing", async () => {
    const user = userEvent.setup();
    const requests: Array<{ method: string; url: URL }> = [];
    let listAnnouncements = announcementFixtures.slice(0, 1);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const rawUrl = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl, "http://localhost");
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      requests.push({ method, url });

      if (url.pathname === "/api/announcements" && method === "POST") {
        listAnnouncements = [
          {
            ...announcementFixtures[0],
            id: "ann-created",
            title: "筛选后发布公告",
            summary: "发布后由服务端刷新回来。",
            type: "安全提醒",
            status: "已发布",
            pinned: false
          }
        ];
        return jsonResponse({ announcement: listAnnouncements[0] }, 201);
      }

      if (url.pathname === "/api/announcements") {
        return jsonResponse({
          announcements: listAnnouncements,
          featuredAnnouncements: [announcementFixtures[0], announcementFixtures[1]],
          summary: [
            { label: "已发布", value: 6 },
            { label: "已归档", value: 2 }
          ],
          page: Number(url.searchParams.get("page") ?? "1"),
          pageSize: Number(url.searchParams.get("pageSize") ?? "4"),
          total: 6
        });
      }

      return jsonResponse({});
    });

    render(<AnnouncementsPage canPublish />);

    await screen.findByRole("heading", { level: 1, name: "核心平台升级窗口" });
    expect(screen.getByText("6")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "公告搜索" }), "安全");
    await user.click(screen.getByRole("combobox", { name: "按类型筛选公告" }));
    await user.click(screen.getByRole("option", { name: "安全提醒" }));
    await user.click(screen.getByRole("combobox", { name: "按状态筛选公告" }));
    await user.click(screen.getByRole("option", { name: "已发布" }));
    await user.click(screen.getByRole("combobox", { name: "按时间筛选公告" }));
    await user.click(screen.getByRole("option", { name: "近 30 天" }));

    await waitFor(() => {
      expect(
        requests.some(({ method, url }) =>
          method === "GET" &&
          url.pathname === "/api/announcements" &&
          url.searchParams.get("scope") === "manage" &&
          url.searchParams.get("q") === "安全" &&
          url.searchParams.get("type") === "安全提醒" &&
          url.searchParams.get("status") === "已发布" &&
          url.searchParams.get("time") === "30d"
        )
      ).toBe(true);
    });

    await user.click(screen.getByRole("button", { name: "发布公告" }));
    const dialog = await screen.findByRole("dialog", { name: "发布公告" });
    await user.type(within(dialog).getByLabelText("公告标题"), "筛选后发布公告");
    await user.type(within(dialog).getByLabelText("公告内容"), "发布后需要重新读取服务端页面。");
    await user.click(within(dialog).getByRole("button", { name: "确认发布" }));

    await waitFor(() => {
      const postIndex = requests.findIndex(({ method, url }) => method === "POST" && url.pathname === "/api/announcements");
      expect(postIndex).toBeGreaterThanOrEqual(0);
      expect(
        requests.slice(postIndex + 1).some(({ method, url }) => method === "GET" && url.pathname === "/api/announcements")
      ).toBe(true);
    });
    expect(await screen.findByRole("heading", { name: "筛选后发布公告" })).toBeInTheDocument();
  });

  it("opens an admin publish dialog and submits the form data to the backend", async () => {
    const user = userEvent.setup();
    let postedBody: Record<string, unknown> | null = null;
    let listAnnouncements: typeof announcementFixtures = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      if (url.includes("/api/announcements") && method === "POST") {
        postedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        listAnnouncements = [
          {
            ...announcementFixtures[0],
            id: "ann-new",
            title: String(postedBody.title),
            summary: String(postedBody.summary),
            pinned: Boolean(postedBody.pinned)
          }
        ];
        return jsonResponse(
          {
            announcement: listAnnouncements[0]
          },
          201
        );
      }

      if (url.includes("/api/announcements")) {
        return jsonResponse({
          announcements: listAnnouncements,
          featuredAnnouncements: listAnnouncements.filter((announcement) => announcement.pinned),
          page: 1,
          pageSize: 4,
          summary: listAnnouncements.length > 0 ? [{ label: "即将开始", value: 1 }] : [],
          total: listAnnouncements.length
        });
      }

      return jsonResponse({});
    });

    const { container } = render(<AnnouncementsPage canPublish />);
    const publishButton = await screen.findByRole("button", { name: "发布公告" });

    expect(container.querySelector(".announcements-publish-icon")).toBeInTheDocument();
    await user.click(publishButton);

    const dialog = await screen.findByRole("dialog", { name: "发布公告" });
    await user.type(within(dialog).getByLabelText("公告标题"), "端到端公告");
    await user.type(within(dialog).getByLabelText("公告内容"), "这是一条通过后台接口发布的真实公告。");
    await user.type(within(dialog).getByLabelText("公告标签"), "接口,公告");
    await user.type(within(dialog).getByLabelText("起始时间"), "2026-06-20T09:00");
    await user.type(within(dialog).getByLabelText("结束时间"), "2026-06-20T11:30");
    await user.click(within(dialog).getByRole("checkbox", { name: "置顶公告" }));
    await user.click(within(dialog).getByRole("button", { name: "确认发布" }));

    await waitFor(() => {
      expect(postedBody).toMatchObject({
        title: "端到端公告",
        summary: "这是一条通过后台接口发布的真实公告。",
        tags: ["接口", "公告"],
        startAt: "2026-06-20T09:00",
        endAt: "2026-06-20T11:30",
        pinned: true
      });
    });
    expect(await screen.findByRole("heading", { level: 1, name: "端到端公告" })).toBeInTheDocument();
  });

  it("opens announcements for receipt and shows admin edit archive delete actions", async () => {
    const user = userEvent.setup();
    const requests: Array<{ body: Record<string, unknown> | null; method: string; url: string }> = [];
    let announcements = announcementFixtures.map((announcement) => ({ ...announcement }));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      requests.push({ body, method, url });

      const receiptMatch = url.match(/\/api\/announcements\/([^/]+)\/receipt$/);
      if (receiptMatch && method === "POST") {
        const announcement = announcements.find((item) => item.id === receiptMatch[1]);
        if (!announcement) return jsonResponse({ message: "Not found" }, 404);
        announcement.receiptStatus = "已签收";
        announcement.acknowledgedAt = "2026-06-14T11:00:00.000Z";
        announcement.receiptSummary = { signed: 1, unsigned: 1 };
        return jsonResponse({ announcement });
      }

      const detailMatch = url.match(/\/api\/announcements\/([^/?]+)$/);
      if (detailMatch && method === "PATCH") {
        const announcement = announcements.find((item) => item.id === detailMatch[1]);
        if (!announcement) return jsonResponse({ message: "Not found" }, 404);
        Object.assign(announcement, body, { updatedAt: "2026-06-14T12:00:00.000Z" });
        return jsonResponse({ announcement });
      }

      if (detailMatch && method === "DELETE") {
        announcements = announcements.filter((item) => item.id !== detailMatch[1]);
        return new Response(null, { status: 204 });
      }

      if (url.includes("/api/announcements")) {
        return jsonResponse({
          announcements,
          page: 1,
          pageSize: 4,
          total: announcements.length
        });
      }

      return jsonResponse({});
    });

    const { container } = render(<AnnouncementsPage canPublish />);
    await screen.findByRole("heading", { level: 1, name: "核心平台升级窗口" });

    const firstItem = container.querySelector(".announcements-timeline .announcements-item") as HTMLElement;
    expect(within(firstItem).getByText("未签收")).toBeInTheDocument();
    expect(within(firstItem).getByText("已签收 0 / 未签收 2")).toBeInTheDocument();
    expect(within(firstItem).getByRole("button", { name: "修改 核心平台升级窗口" })).toBeInTheDocument();
    expect(within(firstItem).getByRole("button", { name: "归档 核心平台升级窗口" })).toBeInTheDocument();
    expect(within(firstItem).getByRole("button", { name: "删除 核心平台升级窗口" })).toBeInTheDocument();

    await user.click(within(firstItem).getByRole("button", { name: "查看公告 核心平台升级窗口" }));
    const viewDialog = await screen.findByRole("dialog", { name: "查看公告" });
    expect(within(viewDialog).getByText("核心平台升级窗口")).toBeInTheDocument();
    expect(within(viewDialog).getByText("未签收")).toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual(
        expect.objectContaining({
          method: "POST",
          url: expect.stringContaining("/api/announcements/ann-1/receipt")
        })
      );
    });
    await user.click(within(viewDialog).getByRole("button", { name: "关闭" }));

    await user.click(within(firstItem).getByRole("button", { name: "修改 核心平台升级窗口" }));
    const editDialog = await screen.findByRole("dialog", { name: "修改公告" });
    await user.clear(within(editDialog).getByLabelText("公告标题"));
    await user.type(within(editDialog).getByLabelText("公告标题"), "核心平台升级窗口已调整");
    await user.click(within(editDialog).getByRole("button", { name: "保存修改" }));
    await waitFor(() => {
      expect(requests).toContainEqual(
        expect.objectContaining({
          body: expect.objectContaining({ title: "核心平台升级窗口已调整" }),
          method: "PATCH",
          url: expect.stringContaining("/api/announcements/ann-1")
        })
      );
    });

    const updatedItem = container.querySelector(".announcements-timeline .announcements-item") as HTMLElement;
    await user.click(within(updatedItem).getByRole("button", { name: "归档 核心平台升级窗口已调整" }));
    await waitFor(() => {
      expect(requests).toContainEqual(
        expect.objectContaining({
          body: expect.objectContaining({ status: "已归档" }),
          method: "PATCH",
          url: expect.stringContaining("/api/announcements/ann-1")
        })
      );
    });

    await user.click(within(updatedItem).getByRole("button", { name: "删除 核心平台升级窗口已调整" }));
    const deleteDialog = await screen.findByRole("dialog", { name: "删除公告" });
    await user.click(within(deleteDialog).getByRole("button", { name: "确认删除" }));
    await waitFor(() => {
      expect(requests).toContainEqual(
        expect.objectContaining({
          method: "DELETE",
          url: expect.stringContaining("/api/announcements/ann-1")
        })
      );
    });
  });

  it("shows only unsigned announcements in the badge and opens recent announcements from the user menu", async () => {
    const user = userEvent.setup();
    let appAnnouncements = [
      ...announcementFixtures,
      {
        ...announcementFixtures[3],
        id: "ann-5",
        title: "旧公告不在最近三条内",
        publishedAt: "2026-06-10T10:00:00.000Z",
        updatedAt: "2026-06-10T10:00:00.000Z"
      }
    ];

    window.history.pushState({}, "", "/dashboard");
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            role: "member",
            createdAt: "2026-04-08T00:00:00.000Z"
          },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }
      if (url.endsWith("/api/profile")) {
        return jsonResponse({
          profile: {
            user: {
              id: "member-1",
              email: "member@example.com",
              name: "Member",
              role: "member",
              status: "active",
              createdAt: "2026-04-08T00:00:00.000Z",
              updatedAt: "2026-04-08T00:00:00.000Z"
            },
            preferences: {
              bio: "",
              locale: "zh-CN",
              timezone: "Asia/Shanghai",
              dateFormat: "yyyy-mm-dd",
              landingPage: "/dashboard",
              density: "comfortable",
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          }
        });
      }
      if (url.endsWith("/api/profile/sessions")) return jsonResponse({ sessions: [] });
      if (url.match(/\/api\/announcements\/([^/]+)\/receipt$/) && method === "POST") {
        const announcementId = url.match(/\/api\/announcements\/([^/]+)\/receipt$/)?.[1];
        const announcement = appAnnouncements.find((item) => item.id === announcementId);
        if (!announcement) return jsonResponse({}, 404);
        const signedAnnouncement = {
          ...announcement,
          acknowledgedAt: "2026-06-14T11:00:00.000Z",
          receiptStatus: "已签收",
          receiptSummary: {
            signed: announcement.receiptSummary.signed + 1,
            unsigned: Math.max(announcement.receiptSummary.unsigned - 1, 0)
          }
        };
        appAnnouncements = appAnnouncements.map((item) => (item.id === announcement.id ? signedAnnouncement : item));
        return jsonResponse({ announcement: signedAnnouncement });
      }
      if (url.includes("/api/announcements")) {
        return jsonResponse({ announcements: appAnnouncements, page: 1, pageSize: 5, total: appAnnouncements.length });
      }
      if (url.endsWith("/api/dashboard")) {
        return jsonResponse({
          kpis: [
            { kicker: "今日收件", label: "收件总量", value: "0", detail: "暂无收件数据", change: "较昨日 0" },
            { kicker: "今日发件", label: "发件总量", value: "0", detail: "暂无发件数据", change: "失败重试 0 次" },
            { kicker: "API 密钥数", label: "活跃密钥", value: "0", detail: "0 个正在使用", change: "0 个待轮换" },
            { kicker: "Webhook", label: "投递端点", value: "0", detail: "0 个正常投递", change: "失败重试 0 次" },
            { kicker: "公告", label: "已发布公告", value: "0", detail: "0 条正在展示", change: "本周发布 0 条" }
          ],
          trend: { week: [], month: [], year: [] },
          accountDistribution: [],
          accountTotal: 0,
          resources: [],
          growth: { week: [], month: [], year: [] },
          userRoles: [],
          userTotal: 0
        });
      }
      if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
      if (url.includes("/api/mail/messages")) return jsonResponse({ messages: [], total: 0, page: 1, pageSize: 10 });
      if (url.includes("/api/mail/outbound")) return jsonResponse({ messages: [], total: 0, page: 1, pageSize: 10 });
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
      if (url.endsWith("/api/telegram/overview")) return jsonResponse({ overview: null });
      if (url.endsWith("/api/telegram/deliveries")) return jsonResponse({ deliveries: [] });

      return jsonResponse({});
    });

    render(<App />);

    const modal = await screen.findByRole("dialog", { name: "公告提醒" });
    expect(within(modal).getByText("核心平台升级窗口")).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "我知道了" }));

    const userMenuButton = await screen.findByRole("button", { name: "用户菜单，3 条公告" });
    expect(userMenuButton).toHaveAttribute("aria-label", "用户菜单，3 条公告");
    expect(userMenuButton.querySelector(".workspace-user-announcement-badge")).not.toBeInTheDocument();
    expect(document.querySelector(".workspace-user-menu > .workspace-user-announcement-badge")).toHaveTextContent("3");
    await user.click(userMenuButton);

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("最近公告")).toBeInTheDocument();
    expect(within(menu).queryByText(/用户名：/)).not.toBeInTheDocument();
    expect(within(menu).getByText("核心平台升级窗口")).toBeInTheDocument();
    expect(within(menu).getByText("发件箱策略更新")).toBeInTheDocument();
    expect(within(menu).getByText("邮箱接收策略说明")).toBeInTheDocument();
    expect(within(menu).queryByText("旧公告不在最近三条内")).not.toBeInTheDocument();

    await user.click(within(menu).getByRole("menuitem", { name: "查看公告 核心平台升级窗口" }));

    const detailDialog = await screen.findByRole("dialog", { name: "公告详情" });
    expect(within(detailDialog).getByText("核心平台升级窗口")).toBeInTheDocument();
    expect(within(detailDialog).getByText("本周六凌晨将进行核心平台升级，期间管理端会短暂只读。")).toBeInTheDocument();
  });
});
