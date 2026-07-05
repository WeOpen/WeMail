import { expect, test, type Page } from "@playwright/test";

async function mockAuthenticatedMember(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      json: {
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
      }
    });
  });

  await page.route("**/api/accounts", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/accounts/list**", async (route) =>
    route.fulfill({
      json: {
        accounts: [],
        total: 0
      }
    })
  );
  await page.route("**/api/accounts/domains", async (route) =>
    route.fulfill({
      json: {
        domains: [{ domain: "example.com", allowedRoles: ["member"] }],
        primaryDomain: "example.com"
      }
    })
  );
  await page.route("**/api/accounts/settings", async (route) =>
    route.fulfill({
      json: {
        policy: {
          creation: {
            defaultTagsEnabled: true,
            defaultTags: "运营",
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
          lastUpdatedLabel: "测试策略"
        }
      }
    })
  );
  await page.route("**/api/profile", async (route) =>
    route.fulfill({
      json: {
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
    })
  );
  const mailMessagesResponse = {
    messages: [
      {
        id: "msg-1",
        mailboxId: "box-1",
        fromAddress: "ops@example.com",
        subject: "Verification",
        previewText: "Use 123456",
        bodyText: "Use 123456",
        extraction: { method: "regex", type: "auth_code", value: "123456", label: "Code" },
        oversizeStatus: null,
        attachmentCount: 0,
        attachments: [],
        receivedAt: "2026-04-08T00:00:00.000Z"
      }
    ]
  };

  await page.route("**/api/mail/messages?**", async (route) =>
    route.fulfill({
      json: mailMessagesResponse
    })
  );
  await page.route("**/api/mail/messages", async (route) =>
    route.fulfill({
      json: mailMessagesResponse
    })
  );
  await page.route("**/api/mail/outbound?**", async (route) =>
    route.fulfill({ json: { messages: [], total: 0, summary: { totalCount: 0, sentCount: 0, failedCount: 0 } } })
  );
  await page.route("**/api/api-keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram/subscription", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/api/profile", async (route) =>
    route.fulfill({
      json: {
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
    })
  );
}

test("shows the optimus-style landing page for signed-out users", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: /首页导航/i });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /把临时邮箱/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /^产品能力$/i })).toBeVisible();
});

test("redirects signed-out deep links into login with a return target", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: /^立即登录$/i })).toBeVisible();
  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/login?next=%2Fsettings");
});

test("keeps the next target when switching auth tabs", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/login?next=%2Fsettings");
  await page.getByRole("tab", { name: /^注册$/i }).click();
  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/register?next=%2Fsettings");
  await page.getByRole("tab", { name: /^登录$/i }).click();
  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/login?next=%2Fsettings");
});

test("restores the intended route after auth when next is present", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      json: {
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
      }
    });
  });
  await page.route("**/api/accounts", async (route) => route.fulfill({ json: { mailboxes: [] } }));
  await page.route("**/api/api-keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram/subscription", async (route) => route.fulfill({ json: { subscription: null } }));

  await page.goto("/login?next=%2Fsettings");
  await expect(page.getByRole("heading", { name: /^API 密钥$/i })).toBeVisible();
  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/settings");
});

test("shows the reworked shared access shell for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/settings");
  const sidebar = page.getByRole("navigation", { name: /工作台导航/i });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /^仪表盘$/i })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /^邮件(?:\s|$)/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^API 密钥$/i })).toBeVisible();
  await expect(page.getByText("总密钥")).toBeVisible();
  await expect(page.getByText("活跃密钥", { exact: true })).toBeVisible();
  await expect(page.getByText("从未使用")).toBeVisible();
  await expect(page.getByText("已吊销")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^接入终端$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /安全建议/i })).toHaveCount(0);
  await expect(page.getByText(/如何选择这三种接入/i)).toHaveCount(0);
  await expect(page.getByLabel(/工作台品牌/i)).toContainText("WeMail");
  await expect(page.getByLabel(/API 密钥 二级菜单/i)).toBeVisible();
  await expect(page.getByLabel(/工作台快速搜索/i)).toHaveCount(0);
  await page.getByRole("button", { name: /用户菜单/i }).click();
  await expect(page.getByRole("menuitem", { name: /退出登录/i })).toBeVisible();

  const themeToggle = page.getByRole("button", { name: /切换到浅色主题|切换到深色主题/i });
  await expect(themeToggle).toBeVisible();
  await page.evaluate(() => {
    window.localStorage.setItem("wemail-workspace-theme", "light");
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  });
  await page.reload();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10000 }).toBe("light");

  await sidebar.getByRole("link", { name: /^邮件(?:\s|$)/i }).click();
  await expect(page.getByRole("navigation", { name: /邮件 二级菜单/i })).toBeVisible();
  await expect(page.getByText(/待提取/i)).toBeVisible();
  await expect(page.getByRole("region", { name: /^消息筛选与列表$/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /^阅读与提取详情$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^消息列表$/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^消息详情$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^发送测试邮件$/i })).toBeVisible();
  await expect(page.locator(".message-extraction-chip").first()).toContainText("123456");
  await expect(page.getByRole("heading", { name: /^发送邮件$/i })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10000 }).toBe("light");
  await sidebar.getByRole("link", { name: /^账号(?:\s|$)/i }).click();
  await expect(page.getByText(/^账号列表$/i).first()).toBeVisible();
  await expect(page.getByText(/已选择\s+\d+\s+个账号/i)).toHaveCount(0);
  await expect(page.locator(".accounts-list-filter-grid")).toBeVisible();
  await expect
    .poll(() => page.locator(".accounts-list-filter-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns), {
      timeout: 10000
    })
    .not.toBe("none");

});


test("redirects legacy /mail/unassigned deep links into the failed outbound view", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/mail/unassigned");

  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/mail/outbound?view=failed");
  await expect(page.getByRole("heading", { name: /^发件箱$/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^失败/i })).toHaveAttribute("aria-selected", "true");

  const secondaryNav = page.getByRole("navigation", { name: /邮件 二级菜单/i });
  await expect(secondaryNav).toBeVisible();
  await expect(secondaryNav.getByRole("tab", { name: /^邮件列表$/i })).toBeVisible();
  await expect(secondaryNav.getByRole("tab", { name: /^发件箱$/i })).toBeVisible();
  await expect(secondaryNav.getByRole("tab", { name: /^邮件设置$/i })).toBeVisible();
  await expect(secondaryNav.getByRole("tab")).toHaveCount(3);
  await expect(secondaryNav.getByText(/无收件人邮件/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^新建发送$/i })).toBeVisible();
});

test("shows the mail settings rule center on its direct route for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/mail/settings");
  await expect(page.getByRole("heading", { name: /^邮件设置$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^发件规则$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^通知与路由$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^工作台行为偏好$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^当前策略摘要$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^保存发件规则$/i })).toBeVisible();
});

test("shows the account settings policy center on its direct route for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/accounts/settings");
  await expect(page.getByRole("heading", { name: /^账号策略中心$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^默认创建规则$/i })).toBeVisible();
  await expect(page.getByLabel("账号设置关键指标")).toBeVisible();
});

test("shows the admin users workspace for an authenticated admin", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: "admin",
          createdAt: "2026-04-08T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });
  });

  await page.route("**/api/accounts", async (route) => route.fulfill({ json: { mailboxes: [] } }));
  await page.route("**/api/api-keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram/subscription", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/api/profile", async (route) =>
    route.fulfill({
      json: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin",
          role: "admin",
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
    })
  );
  await page.route("**/api/users**", async (route) => {
    if (new URL(route.request().url()).pathname !== "/api/users") return route.fallback();
    return route.fulfill({
      json: {
        users: [
          { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
        ],
        page: 1,
        pageSize: 10,
        total: 2
      }
    });
  });
  await page.route("**/api/users/summary?**", async (route) =>
    route.fulfill({
      json: {
        quotaUsers: [
          { id: "admin-1", email: "admin@example.com", role: "admin", status: "active", createdAt: "2026-04-08T00:00:00.000Z", updatedAt: "2026-04-08T00:00:00.000Z" },
          { id: "member-1", email: "member@example.com", role: "member", status: "active", createdAt: "2026-04-10T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z" }
        ],
        quotaUsersPage: 1,
        quotaUsersPageSize: 5,
        quotaUsersTotal: 2,
        stats: { active: 2, total: 2 }
      }
    })
  );
  await page.route("**/api/users/invites?**", async (route) =>
    route.fulfill({
      json: {
        available: 1,
        invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }],
        page: 1,
        pageSize: 5,
        total: 1
      }
    })
  );
  await page.route("**/api/users/invites", async (route) =>
    route.fulfill({
      json: {
        available: 1,
        invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }],
        page: 1,
        pageSize: 5,
        total: 1
      }
    })
  );
  await page.route("**/api/system/features", async (route) =>
    route.fulfill({
      json: {
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    })
  );
  await page.route("**/api/users/**/quota", async (route) =>
    route.fulfill({
      json: {
        quota: {
          userId: "admin-1",
          apiDailyLimit: 20000,
          apiCallsToday: 0,
          dailyLimit: 20,
          sendsToday: 0,
          disabled: false,
          updatedAt: "2026-04-08T00:00:00.000Z"
        }
      }
    })
  );
  await page.route("**/api/users/accounts?**", async (route) =>
    route.fulfill({
      json: {
        latestMailbox: { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }],
        page: 1,
        pageSize: 5,
        total: 1
      }
    })
  );
  await page.route("**/api/users/accounts", async (route) =>
    route.fulfill({
      json: {
        latestMailbox: { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }],
        page: 1,
        pageSize: 5,
        total: 1
      }
    })
  );

  await page.goto("/admin");
  const sidebar = page.getByRole("navigation", { name: /工作台导航/i });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /^用户(?:\s|$)/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /用户 二级菜单/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邀请与入场/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /配额策略/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邮箱监管/i })).toBeVisible();
  await expect(page.getByLabel(/工作台品牌/i)).toContainText("WeMail");
  await expect(page.getByText(/ops@example.com/i)).toBeVisible();
});

test("shows the admin dashboard mock board for an authenticated admin", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: "admin",
          createdAt: "2026-04-08T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: false
        }
      }
    });
  });

  await page.route("**/api/accounts", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/mail/messages?**", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/mail/outbound?**", async (route) =>
    route.fulfill({ json: { messages: [], total: 0, summary: { totalCount: 0, sentCount: 0, failedCount: 0 } } })
  );
  await page.route("**/api/api-keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram/subscription", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/api/profile", async (route) =>
    route.fulfill({
      json: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin",
          role: "admin",
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
    })
  );
  await page.route("**/api/dashboard", async (route) =>
    route.fulfill({
      json: {
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
      }
    })
  );
  await page.route("**/api/users**", async (route) => {
    if (new URL(route.request().url()).pathname !== "/api/users") return route.fallback();
    return route.fulfill({
      json: {
        users: [
          { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
        ],
        page: 1,
        pageSize: 10,
        total: 2
      }
    });
  });
  await page.route("**/api/users/summary?**", async (route) =>
    route.fulfill({
      json: {
        quotaUsers: [
          { id: "admin-1", email: "admin@example.com", role: "admin", status: "active", createdAt: "2026-04-08T00:00:00.000Z", updatedAt: "2026-04-08T00:00:00.000Z" },
          { id: "member-1", email: "member@example.com", role: "member", status: "active", createdAt: "2026-04-10T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z" }
        ],
        quotaUsersPage: 1,
        quotaUsersPageSize: 5,
        quotaUsersTotal: 2,
        stats: { active: 2, total: 2 }
      }
    })
  );
  await page.route("**/api/users/invites?**", async (route) =>
    route.fulfill({
      json: {
        available: 1,
        invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }],
        page: 1,
        pageSize: 5,
        total: 1
      }
    })
  );
  await page.route("**/api/users/invites", async (route) =>
    route.fulfill({
      json: {
        available: 1,
        invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }],
        page: 1,
        pageSize: 5,
        total: 1
      }
    })
  );
  await page.route("**/api/system/features", async (route) =>
    route.fulfill({
      json: {
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: false
        }
      }
    })
  );
  await page.route("**/api/users/**/quota", async (route) =>
    route.fulfill({
      json: {
        quota: {
          userId: "admin-1",
          apiDailyLimit: 20000,
          apiCallsToday: 0,
          dailyLimit: 20,
          sendsToday: 8,
          disabled: false,
          updatedAt: "2026-04-08T00:00:00.000Z"
        }
      }
    })
  );
  await page.route("**/api/users/accounts?**", async (route) =>
    route.fulfill({
      json: {
        latestMailbox: { id: "box-2", address: "growth@example.com", label: "Growth", createdAt: "2026-04-09T00:00:00.000Z" },
        mailboxes: [
          { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "box-2", address: "growth@example.com", label: "Growth", createdAt: "2026-04-09T00:00:00.000Z" }
        ],
        page: 1,
        pageSize: 5,
        total: 2
      }
    })
  );
  await page.route("**/api/users/accounts", async (route) =>
    route.fulfill({
      json: {
        latestMailbox: { id: "box-2", address: "growth@example.com", label: "Growth", createdAt: "2026-04-09T00:00:00.000Z" },
        mailboxes: [
          { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "box-2", address: "growth@example.com", label: "Growth", createdAt: "2026-04-09T00:00:00.000Z" }
        ],
        page: 1,
        pageSize: 5,
        total: 2
      }
    })
  );

  await page.goto("/dashboard");
  await expect(page.getByText("今日收件")).toBeVisible();
  await expect(page.getByText("今日发件")).toBeVisible();
  await expect(page.getByText("API 密钥数")).toBeVisible();
  await expect(page.getByText("投递端点")).toBeVisible();
  await expect(page.getByText("已发布公告")).toBeVisible();
  await expect(page.getByRole("heading", { name: "趋势" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "账号" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "角色" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "增长" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "资源" })).toBeVisible();
  await expect(page.getByRole("img", { name: "用户角色环形图" })).toBeVisible();
  await expect(page.getByLabel("趋势周期").getByRole("tab", { name: "周" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("增长周期").getByRole("tab", { name: "周" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("新增账号")).toBeVisible();
  await expect(page.getByText("新增邮箱")).toBeVisible();
  await expect(page.getByLabel("仪表盘核心指标").getByText("Webhook")).toBeVisible();
  await expect(page.getByText("已发布公告")).toBeVisible();
  await expect(page.getByText("最近新增账号")).toHaveCount(0);
  await expect(page.getByText(/收件较昨日增长/i)).toHaveCount(0);
  await expect(page.getByText("测试邮箱")).toHaveCount(0);
  await expect(page.getByText("活跃邮箱")).toHaveCount(0);
});

test("shows the announcements board for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      json: {
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
      }
    });
  });

  await page.route("**/api/accounts", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/mail/messages?**", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/mail/outbound?**", async (route) =>
    route.fulfill({ json: { messages: [], total: 0, summary: { totalCount: 0, sentCount: 0, failedCount: 0 } } })
  );
  await page.route("**/api/api-keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram/subscription", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/api/profile**", async (route) =>
    route.fulfill({
      json: {
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
      }
    })
  );
  await page.route("**/api/announcements?**", async (route) =>
    route.fulfill({
      json: {
        announcements: [
          {
            id: "ann-1",
            title: "4 月核心平台升级将于本周六凌晨执行",
            summary: "维护窗口内邮件收取保持可用，部分后台配置会短暂只读。",
            type: "维护通知",
            status: "进行中",
            audience: "全部成员",
            priority: "高",
            author: "admin@example.com",
            tags: ["维护"],
            pinned: true,
            acknowledgedAt: null,
            receiptStatus: "未签收",
            receiptSummary: { signed: 0, unsigned: 1 },
            publishedAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z"
          }
        ],
        featuredAnnouncements: [
          {
            id: "ann-1",
            title: "4 月核心平台升级将于本周六凌晨执行",
            summary: "维护窗口内邮件收取保持可用，部分后台配置会短暂只读。",
            type: "维护通知",
            status: "进行中",
            audience: "全部成员",
            priority: "高",
            author: "admin@example.com",
            tags: ["维护"],
            pinned: true,
            acknowledgedAt: null,
            receiptStatus: "未签收",
            receiptSummary: { signed: 0, unsigned: 1 },
            publishedAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z"
          }
        ],
        page: 1,
        pageSize: 4,
        summary: [
          { label: "进行中", value: 1 },
          { label: "即将开始", value: 0 },
          { label: "已结束", value: 0 },
          { label: "已归档", value: 0 }
        ],
        total: 1
      }
    })
  );

  await page.goto("/announcements");
  await page.getByRole("button", { name: /^我知道了$/i }).click({ timeout: 5000 }).catch(() => {});
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect(page.getByRole("button", { name: /发布公告/i })).toHaveCount(0);
  await expect(page.getByLabel("最近公告筛选")).toBeVisible();
  await expect(page.getByLabel("公告控制条")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^已发布$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^进行中$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^即将开始$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^已结束$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^已归档$/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /4 月核心平台升级将于本周六凌晨执行/i })).toBeVisible();
  await expect(page.getByText(/^最近公告$/i)).toBeVisible();
  await expect(page.getByText(/^概览$/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /公告状态分布/i })).toHaveCount(0);
  await expect(page.getByText(/当前对成员可见|24h 内计划公告|待归档复盘|历史公告沉淀/i)).toHaveCount(0);
  await expect(page.getByText(/^时间线$/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /状态概览/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /近期维护窗口/i })).toHaveCount(0);
});

test("shows the publish announcement button for an authenticated admin", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          role: "admin",
          createdAt: "2026-04-08T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      }
    });
  });

  await page.route("**/api/accounts", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/mail/messages?**", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/mail/outbound?**", async (route) =>
    route.fulfill({ json: { messages: [], total: 0, summary: { totalCount: 0, sentCount: 0, failedCount: 0 } } })
  );
  await page.route("**/api/api-keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram/subscription", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/api/profile", async (route) =>
    route.fulfill({
      json: {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          name: "Admin",
          role: "admin",
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
    })
  );
  await page.route("**/api/announcements?**", async (route) =>
    route.fulfill({ json: { announcements: [], featuredAnnouncements: [], page: 1, pageSize: 4, summary: [], total: 0 } })
  );

  await page.goto("/announcements");
  await expect(page.getByRole("button", { name: /发布公告/i })).toBeVisible();
});
