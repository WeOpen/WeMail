import { expect, test } from "@playwright/test";

test("shows the optimus-style landing page for signed-out users", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: /landing page navigation/i });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("heading", { name: /The platform/i })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /^Features$/i })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /密钥、通知与接入控制/i })).toBeVisible();
  await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/settings");
});

test("shows the reworked shared access shell for an authenticated member", async ({ page }) => {
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

  await page.goto("/settings");
  const sidebar = page.getByRole("navigation", { name: /工作台导航/i });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /^仪表盘$/i })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: /^邮件(?:\s|$)/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /密钥、通知与接入控制/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /API 密钥/i })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /一个工作台，管理所有邮箱/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /当前邮箱/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /最新消息/i })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10000 }).toBe("light");
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
  await expect(page.getByRole("heading", { name: /访问、配额与系统开关/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邀请码控制/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /配额控制/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /邮箱总览/i })).toBeVisible();
  await expect(page.getByLabel(/工作台品牌/i)).toContainText("WeMail");
  await expect(page.getByText(/ops@example.com/i)).toBeVisible();
});
