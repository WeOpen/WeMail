import { expect, test, type Page } from "@playwright/test";

async function mockAuthenticatedMember(page: Page) {
  await page.route("**/auth/session", async (route) => {
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

  await page.route("**/api/mailboxes", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/messages?mailboxId=box-1", async (route) =>
    route.fulfill({
      json: {
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
      }
    })
  );
  await page.route("**/api/outbound?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram", async (route) => route.fulfill({ json: { subscription: null } }));
}

test("shows the optimus-style landing page for signed-out users", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: /首页导航/i });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("heading", { name: /把临时邮箱/i })).toBeVisible();
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
  await page.route("**/auth/session", async (route) => {
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
  await page.route("**/api/mailboxes", async (route) => route.fulfill({ json: { mailboxes: [] } }));
  await page.route("**/api/keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram", async (route) => route.fulfill({ json: { subscription: null } }));

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
  await expect(page.getByText("活跃密钥")).toBeVisible();
  await expect(page.getByText("从未使用")).toBeVisible();
  await expect(page.getByText("已吊销")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^快速开始$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /安全建议/i })).toHaveCount(0);
  await expect(page.getByText(/如何选择这三种接入/i)).toHaveCount(0);
  await expect(page.getByLabel(/工作台品牌/i)).toContainText("WeMail");
  await expect(page.getByLabel(/API 密钥 二级菜单/i)).toHaveCount(0);
  await expect(page.getByLabel(/工作台快速搜索/i)).toHaveCount(0);
  await page.getByRole("button", { name: /用户菜单/i }).click();
  await expect(page.getByRole("menuitem", { name: /退出登录/i })).toBeVisible();

  const themeToggle = page.locator(".workspace-theme-toggle");
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
  await expect(page.getByRole("heading", { name: /^消息列表$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^消息详情$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^发送测试邮件$/i })).toBeVisible();
  await expect(page.locator(".message-extraction-chip").first()).toContainText("123456");
  await expect(page.getByRole("heading", { name: /^发送邮件$/i })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10000 }).toBe("light");
  await sidebar.getByRole("link", { name: /^账号(?:\s|$)/i }).click();
  await expect(page.getByRole("heading", { name: /^账号列表$/i })).toBeVisible();
  await expect(page.getByText(/已选择\s+\d+\s+个账号/i)).toHaveCount(0);
  await expect(page.locator(".accounts-list-filter-grid")).toBeVisible();
  await expect
    .poll(() => page.locator(".accounts-list-filter-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns), {
      timeout: 10000
    })
    .not.toBe("none");

});


test("redirects legacy /mail/unassigned deep links into the outbound exceptions view", async ({ page }) => {
  test.setTimeout(60000);
  await mockAuthenticatedMember(page);

  await page.goto("/mail/unassigned");

  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/mail/outbound?view=exceptions");
  await expect(page.getByRole("heading", { name: /^发件箱$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toHaveAttribute("aria-pressed", "true");

  const secondaryNav = page.getByRole("navigation", { name: /邮件 二级菜单/i });
  await expect(secondaryNav).toBeVisible();
  await expect(secondaryNav.getByRole("link", { name: /^邮件列表$/i })).toBeVisible();
  await expect(secondaryNav.getByRole("link", { name: /^发件箱$/i })).toBeVisible();
  await expect(secondaryNav.getByRole("link", { name: /^邮件设置$/i })).toBeVisible();
  await expect(secondaryNav.getByRole("link")).toHaveCount(3);
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
  await expect(page.getByRole("heading", { name: /^账号设置$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^当前策略摘要$/i })).toBeVisible();
  await expect(page.locator(".accounts-settings-summary-row")).toHaveCount(6);
});

test("shows the admin users workspace for an authenticated admin", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/auth/session", async (route) => {
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

  await page.route("**/api/mailboxes", async (route) => route.fulfill({ json: { mailboxes: [] } }));
  await page.route("**/api/keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/admin/users", async (route) =>
    route.fulfill({
      json: {
        users: [
          { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
        ]
      }
    })
  );
  await page.route("**/admin/invites", async (route) =>
    route.fulfill({
      json: {
        invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }]
      }
    })
  );
  await page.route("**/admin/features", async (route) =>
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
  await page.route("**/admin/quotas/**", async (route) =>
    route.fulfill({
      json: {
        quota: {
          userId: "admin-1",
          dailyLimit: 20,
          sendsToday: 0,
          disabled: false,
          updatedAt: "2026-04-08T00:00:00.000Z"
        }
      }
    })
  );
  await page.route("**/admin/mailboxes", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );

  await page.goto("/admin");
  const sidebar = page.getByRole("navigation", { name: /工作台导航/i });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /^用户(?:\s|$)/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /用户 二级菜单/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邀请码控制/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /配额控制/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邮箱总览/i })).toBeVisible();
  await expect(page.getByLabel(/工作台品牌/i)).toContainText("WeMail");
  await expect(page.getByText(/ops@example.com/i)).toBeVisible();
});

test("shows the admin dashboard mock board for an authenticated admin", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/auth/session", async (route) => {
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

  await page.route("**/api/mailboxes", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/messages?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/outbound?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram", async (route) => route.fulfill({ json: { subscription: null } }));
  await page.route("**/admin/users", async (route) =>
    route.fulfill({
      json: {
        users: [
          { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
        ]
      }
    })
  );
  await page.route("**/admin/invites", async (route) =>
    route.fulfill({
      json: {
        invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }]
      }
    })
  );
  await page.route("**/admin/features", async (route) =>
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
  await page.route("**/admin/quotas/**", async (route) =>
    route.fulfill({
      json: {
        quota: {
          userId: "admin-1",
          dailyLimit: 20,
          sendsToday: 8,
          disabled: false,
          updatedAt: "2026-04-08T00:00:00.000Z"
        }
      }
    })
  );
  await page.route("**/admin/mailboxes", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [
          { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "box-2", address: "growth@example.com", label: "Growth", createdAt: "2026-04-09T00:00:00.000Z" }
        ]
      }
    })
  );

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /今日收件/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /近 7 天收发趋势/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邮箱状态分布/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /重点资源概览/i })).toBeVisible();
});

test("shows the announcements board for an authenticated member", async ({ page }) => {
  test.setTimeout(60000);
  await page.route("**/auth/session", async (route) => {
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

  await page.route("**/api/mailboxes", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/messages?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/outbound?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram", async (route) => route.fulfill({ json: { subscription: null } }));

  await page.goto("/announcements");
  await expect(page.getByRole("searchbox", { name: /公告搜索/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /发布公告/i })).toHaveCount(0);
  await expect(page.getByLabel("最近公告筛选")).toBeVisible();
  await expect(page.getByLabel("公告控制条")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^进行中$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^即将开始$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^本周已结束$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^已归档$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /4 月核心平台升级将于本周六凌晨执行/i })).toBeVisible();
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
  await page.route("**/auth/session", async (route) => {
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

  await page.route("**/api/mailboxes", async (route) =>
    route.fulfill({
      json: {
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      }
    })
  );
  await page.route("**/api/messages?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/outbound?mailboxId=box-1", async (route) => route.fulfill({ json: { messages: [] } }));
  await page.route("**/api/keys", async (route) => route.fulfill({ json: { keys: [] } }));
  await page.route("**/api/telegram", async (route) => route.fulfill({ json: { subscription: null } }));

  await page.goto("/announcements");
  await expect(page.getByRole("button", { name: /发布公告/i })).toBeVisible();
});
