import { expect, test } from "@playwright/test";

test("shows the landing page headline", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /自托管临时邮箱，给团队一套可控的收信与管理工作台/i })
  ).toBeVisible();
});

test("shows the shared access shell for an authenticated member", async ({ page }) => {
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
  await expect(page.getByRole("navigation", { name: /workspace navigation/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /keys, alerts, every integration/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /api keys/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /telegram relay/i })).toBeVisible();

  const themeToggle = page.locator(".workspace-theme-toggle");
  await expect(themeToggle).toBeVisible();
  await page.evaluate(() => {
    window.localStorage.setItem("wemail-workspace-theme", "light");
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  });
  await page.reload();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10000 }).toBe("light");

  await page.getByRole("navigation", { name: /workspace navigation/i }).getByRole("link", { name: /^Inbox$/i }).click();
  await expect(page.getByRole("heading", { name: /one workspace, every mailbox/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /active mailboxes/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /recent messages/i })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10000 }).toBe("light");
});

test("shows the control workspace for an authenticated admin", async ({ page }) => {
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
  await expect(page.getByRole("navigation", { name: /workspace navigation/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /control access, quotas, every switch/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /invite control/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /quota control/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /mailbox oversight/i })).toBeVisible();
  await expect(page.getByText(/ops@example.com/i)).toBeVisible();
});
