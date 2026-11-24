import { test, expect } from "@playwright/test"

/**
 * Feature flags default OFF — gated product CTAs stay hidden.
 */
test.describe("S13 feature flags off", () => {
  test("marketing does not advertise Find Coach when marketplace flag is off", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(
      page.getByRole("link", {
        name: /Find a coach|Znajdź trenera|Знайти тренера/i,
      })
    ).toHaveCount(0)
  })
})
