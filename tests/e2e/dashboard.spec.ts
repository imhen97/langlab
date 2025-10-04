import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - you might need to adjust this based on your auth setup
    await page.goto("/dashboard");
  });

  test("should load dashboard page", async ({ page }) => {
    await expect(page.getByText(/안녕하세요/i)).toBeVisible();
    await expect(
      page.getByText(/오늘도 영어 학습을 시작해보세요/i)
    ).toBeVisible();
  });

  test("should display progress dashboard", async ({ page }) => {
    // Check if progress components are visible
    await expect(page.getByText(/학습 통계/i)).toBeVisible();
    await expect(page.getByText(/이번 주 목표/i)).toBeVisible();
  });

  test("should have navigation menu", async ({ page }) => {
    await expect(page.getByRole("link", { name: /대시보드/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /레슨 만들기/i })
    ).toBeVisible();
  });

  test("should display quick actions", async ({ page }) => {
    await expect(page.getByText(/빠른 시작/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /새 레슨 만들기/i })
    ).toBeVisible();
  });

  test("should show subscription management", async ({ page }) => {
    await expect(page.getByText(/구독 관리/i)).toBeVisible();
  });

  test("should show referral system", async ({ page }) => {
    await expect(page.getByText(/추천 시스템/i)).toBeVisible();
  });

  test("should have theme toggle", async ({ page }) => {
    // Check if theme toggle button exists
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="Toggle"]'
    );
    await expect(themeToggle).toBeVisible();
  });
});




