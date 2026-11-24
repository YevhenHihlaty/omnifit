import { test, expect } from "@playwright/test"

/**
 * Coach signup smoke tests.
 * Full signup→verify→onboard→dashboard flow requires SUPABASE_E2E=1 (email confirm).
 */
test.describe("Coach signup", () => {
  test("register page renders coach signup fields", async ({ page }) => {
    await page.goto("/register")
    // No role picker — coaches only
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("textbox", { name: /full name/i })).toBeVisible()
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
    // No client role picker should exist
    expect(await page.getByRole("radio").count()).toBe(0)
    expect(await page.getByText(/client/i, { exact: false }).count()).toBe(0)
  })

  test("anonymous /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("anonymous /onboarding redirects to /login", async ({ page }) => {
    await page.goto("/onboarding/profile")
    await expect(page).toHaveURL(/\/login/)
  })

  test.skip(
    !process.env.SUPABASE_E2E,
    "full signup flow (requires SUPABASE_E2E=1 and real Supabase)"
  )
  // ponytail: real signup test deferred — needs email confirm bypass or magic link
})
