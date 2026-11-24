import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SavedMealsView } from "./SavedMealsView"
import { buildSavedMealsLabels } from "./labels"
import type { SavedMealListItem } from "./types"

const refreshMock = vi.fn()

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock("./actions", () => ({
  logSavedMeal: vi.fn(),
}))

import { logSavedMeal } from "./actions"

const mockLogSavedMeal = vi.mocked(logSavedMeal)

const labels = buildSavedMealsLabels((key) => {
  const map: Record<string, string> = {
    "savedMeals.title": "Saved meals",
    "savedMeals.subtitle": "Quick logging",
    "savedMeals.backToLogMeal": "Back to log meal",
    "savedMeals.logAgain": "Log again",
    "savedMeals.loggedSuccess": "Meal logged.",
    "savedMeals.emptyTitle": "No saved meals yet",
    "savedMeals.emptyBody": "Save a meal from Log Meal to see it here.",
    "savedMeals.goToLogMeal": "Go to Log Meal",
    "savedMeals.lastUsed": "Last logged {date}",
    "savedMeals.neverUsed": "Not logged yet",
    "savedMeals.loadFailed": "Couldn't load saved meals.",
    "savedMeals.retry": "Retry",
  }
  return map[key] ?? key
})

const sampleMeal: SavedMealListItem = {
  id: "meal-1",
  name: "Post-workout lunch",
  mealType: "lunch",
  lastUsedAt: null,
  macros: { caloriesKcal: 520, proteinG: 40, carbsG: 45, fatG: 18 },
}

describe("SavedMealsView", () => {
  beforeEach(() => {
    mockLogSavedMeal.mockReset()
    refreshMock.mockReset()
  })

  it("empty CTA links to log meal", () => {
    render(<SavedMealsView labels={labels} meals={[]} />)
    expect(screen.getByRole("link", { name: "Go to Log Meal" })).toHaveAttribute(
      "href",
      "/log/meal"
    )
  })

  it("shows success message after logging again", async () => {
    mockLogSavedMeal.mockResolvedValue({ success: true })
    render(<SavedMealsView labels={labels} meals={[sampleMeal]} />)
    fireEvent.click(screen.getByRole("button", { name: /Log again/i }))
    await waitFor(() => {
      expect(screen.getByText("Meal logged.")).toBeInTheDocument()
      expect(screen.getByRole("status")).toHaveTextContent("Meal logged.")
    })
  })

  it("shows loadFailed banner and retries via router.refresh", () => {
    render(<SavedMealsView labels={labels} meals={[]} loadFailed />)
    expect(screen.getByText("Couldn't load saved meals.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(refreshMock).toHaveBeenCalled()
  })
})
