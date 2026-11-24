import { test, expect } from "@playwright/test"

/**
 * Sprint 13 marketing + flag smoke (no auth required).
 */
test.describe("S13 marketing + SEO smoke", () => {
  test("landing shows OmniFit brand hero and product section", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /OmniFit home/i })).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("#product")).toBeVisible()
    await expect(page.locator("#product-heading")).toBeVisible()
  })

  test("pricing shows Free, Pro $29, and Team coming soon", async ({
    page,
  }) => {
    await page.goto("/pricing")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /^Free$|^Darmowy$|^Безкоштовний$/i })
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: /^Pro$/i })).toBeVisible()
    await expect(page.getByText("$29")).toBeVisible()
    await expect(page.getByRole("heading", { name: /^Team$/i })).toBeVisible()
    await expect(
      page.getByText(/Coming soon|Wkrótce|Незабаром/i).first()
    ).toBeVisible()
  })

  test("legal pages have real section content", async ({ page }) => {
    await page.goto("/privacy")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible()
    await page.goto("/terms")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible()
  })

  test("offline error page renders", async ({ page }) => {
    await page.goto("/offline")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Retry|Spróbuj|Повторити/i })
    ).toBeVisible()
  })

  test("robots and sitemap are reachable", async ({ request }) => {
    const robots = await request.get("/robots.txt")
    expect(robots.ok()).toBeTruthy()
    const robotsText = await robots.text()
    expect(robotsText).toContain("Disallow: /dashboard")
    expect(robotsText).toContain("Disallow: /offline")
    expect(robotsText).toContain("Sitemap:")

    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.ok()).toBeTruthy()
    const xml = await sitemap.text()
    expect(xml).toContain("/pricing")
  })
})
