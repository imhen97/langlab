import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");

    // Check if the main heading is visible
    await expect(
      page.getByRole("heading", { name: /랭귀지랩/i })
    ).toBeVisible();

    // Check if the main CTA button is visible
    await expect(page.getByRole("button", { name: /시작하기/i })).toBeVisible();
  });

  test("should navigate to dashboard when clicking start button", async ({
    page,
  }) => {
    await page.goto("/");

    // Click the start button
    await page.getByRole("button", { name: /시작하기/i }).click();

    // Should redirect to dashboard (or auth page)
    await expect(page).toHaveURL(/dashboard|auth/);
  });

  test("should display features section", async ({ page }) => {
    await page.goto("/");

    // Check if features are visible
    await expect(page.getByText(/AI 튜터/i)).toBeVisible();
    await expect(page.getByText(/음성 인식/i)).toBeVisible();
    await expect(page.getByText(/진행률 추적/i)).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check if the page is still usable on mobile
    await expect(
      page.getByRole("heading", { name: /랭귀지랩/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /시작하기/i })).toBeVisible();
  });
});




