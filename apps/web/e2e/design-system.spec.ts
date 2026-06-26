import { expect, test, type Page } from "@playwright/test";

const snapshotUpdatesEnabled = process.env.PW_UPDATE_DESIGN_SYSTEM_SNAPSHOTS === "1";

async function mockPublicSession(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({ status: 401, json: { error: "not authenticated" } });
  });
}

async function visitDesignSystem(page: Page, theme: "light" | "dark") {
  await mockPublicSession(page);
  await page.addInitScript((nextTheme) => {
    window.localStorage.setItem("wemail-workspace-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
  }, theme);

  await page.goto("/design-system");
  await expect(page.getByRole("navigation", { name: "首页导航" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Components" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Component groups" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Foundations 组件组" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /design system sidebar/i })).toHaveCount(0);
  await expect(page.getByTestId("design-system-page")).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.theme), { timeout: 10_000 })
    .toBe(theme);
}

test("shows the design system page as a grouped component gallery", async ({ page }) => {
  await visitDesignSystem(page, "light");

  await expect(page.getByTestId("design-system-group-card").first()).toBeVisible();
  await expect(page.getByTestId("design-system-component-card").first()).toBeVisible();
  const buttonCard = page.getByRole("article", { name: "Button 组件展示" });
  await expect(buttonCard).toBeVisible();
  await expect(buttonCard.getByRole("button", { name: "保存变更" })).toBeVisible();
  await expect(buttonCard.getByRole("button", { name: "查看历史" })).toBeVisible();
});

test.describe("design system visual regression scaffold", () => {
  test.skip(
    !snapshotUpdatesEnabled,
    "Enable PW_UPDATE_DESIGN_SYSTEM_SNAPSHOTS=1 when the preview examples and CI screenshot environment are ready."
  );

  for (const theme of ["light", "dark"] as const) {
    test(`captures the ${theme} theme shell`, async ({ page }) => {
      await visitDesignSystem(page, theme);

      await expect(page.getByTestId("design-system-page")).toHaveScreenshot(`design-system-${theme}.png`, {
        animations: "disabled"
      });
    });
  }
});
