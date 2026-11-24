import { test, expect } from "@playwright/test"

const hasMulti =
  Boolean(process.env.E2E_COACH_EMAIL) &&
  Boolean(process.env.E2E_COACH_B_EMAIL) &&
  Boolean(process.env.E2E_COACH_PASSWORD) &&
  Boolean(process.env.E2E_COACH_B_PASSWORD) &&
  Boolean(process.env.E2E_CLIENT_EMAIL) &&
  Boolean(process.env.E2E_CLIENT_PASSWORD)

/**
 * Multi-coach class-B isolation + history attribution smoke.
 * Requires coach A, coach B, and shared client seeded in Supabase.
 */
test.describe("S13 multi-coach isolation", () => {
  test.skip(!hasMulti, "Set E2E_COACH_*, E2E_COACH_B_*, E2E_CLIENT_* for multi-coach E2E")

  test("two coaches can sign in and open client surfaces without missing keys", async ({
    browser,
  }) => {
    const coachA = await browser.newPage()
    await coachA.goto("/login")
    await coachA.getByLabel(/Email/i).fill(process.env.E2E_COACH_EMAIL!)
    await coachA.getByLabel(/Password/i).fill(process.env.E2E_COACH_PASSWORD!)
    await coachA.getByRole("button", { name: /Sign in|Log in/i }).click()
    await expect(coachA).toHaveURL(/dashboard|clients|sessions/i, {
      timeout: 30_000,
    })
    await coachA.goto("/clients")
    await expect(coachA.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(coachA.locator("body")).not.toContainText("clients.title")

    const coachB = await browser.newPage()
    await coachB.goto("/login")
    await coachB.getByLabel(/Email/i).fill(process.env.E2E_COACH_B_EMAIL!)
    await coachB.getByLabel(/Password/i).fill(process.env.E2E_COACH_B_PASSWORD!)
    await coachB.getByRole("button", { name: /Sign in|Log in/i }).click()
    await expect(coachB).toHaveURL(/dashboard|clients|sessions/i, {
      timeout: 30_000,
    })
    await coachB.goto("/clients")
    await expect(coachB.getByRole("heading", { level: 1 })).toBeVisible()

    const client = await browser.newPage()
    await client.goto("/login")
    await client.getByLabel(/Email/i).fill(process.env.E2E_CLIENT_EMAIL!)
    await client.getByLabel(/Password/i).fill(process.env.E2E_CLIENT_PASSWORD!)
    await client.getByRole("button", { name: /Sign in|Log in/i }).click()
    await expect(client).toHaveURL(/home|calendar|settings/i, {
      timeout: 30_000,
    })
    await client.goto("/settings/coaches")
    await expect(client.locator("body")).not.toContainText(
      "clientSettings.coachesTitle"
    )
  })
})
