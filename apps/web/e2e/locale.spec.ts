import { test, expect } from "@playwright/test"

/**
 * Locale switch on marketing — no missing-key crashes; PL/UK copy differs from EN.
 */
test.describe("S13 locale switch", () => {
  test("marketing locale switcher changes language without raw keys", async ({
    page,
  }) => {
    await page.goto("/")
    const openSwitcher = page.getByRole("button", {
      name: /Language|Język|Мова/i,
    })
    await expect(openSwitcher).toBeVisible()
    await openSwitcher.click()
    await page.getByRole("option", { name: /Polski/i }).click()

    await expect(page.locator("body")).not.toContainText("home.tagline")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: /Cennik/i }).first()).toBeVisible()

    await page.goto("/pricing")
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/cennik|praktyk/i)
    await expect(page.locator("body")).not.toContainText("pricing.faq1q")
    await expect(page.getByText(/\/ mies\./i).first()).toBeVisible()

    await page.getByRole("button", { name: /Language|Język|Мова/i }).click()
    await page.getByRole("option", { name: /Українська/i }).click()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(/\/ міс\./i).first()).toBeVisible()
    await expect(page.locator("body")).not.toContainText("home.feature1Title")
  })
})
