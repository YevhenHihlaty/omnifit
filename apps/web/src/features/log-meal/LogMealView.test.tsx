import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LogMealView } from "./LogMealView"
import type { FoodProductListItem, LogMealPageData } from "./types"
import { buildLogMealLabels } from "./labels"

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

vi.mock("./actions", () => ({
  searchProductsAction: vi.fn(async () => []),
  incrementUsage: vi.fn(async () => undefined),
  createMealWithItems: vi.fn(),
  saveAsMeal: vi.fn(),
  createManualProduct: vi.fn(),
}))

import { searchProductsAction } from "./actions"

const mockSearch = vi.mocked(searchProductsAction)

const yogurt: FoodProductListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Greek Yogurt",
  brand: "Fage",
  servingSizeG: 250,
  caloriesKcal: 240,
  proteinG: 20,
  carbsG: 8,
  fatG: 10,
  source: "seed",
  createdBy: null,
  usageCount: 0,
}

const initialData: LogMealPageData = {
  recents: [yogurt],
  defaultMealType: "lunch",
  todayTotals: { caloriesKcal: 400, proteinG: 30, carbsG: 40, fatG: 12 },
  targetKcal: 2100,
  targetProteinG: 150,
  targetCarbsG: 200,
  targetFatG: 70,
}

const labels = buildLogMealLabels((key) => {
  const map: Record<string, string> = {
    "logMeal.title": "Log meal",
    "logMeal.mealTypeTabsAria": "Meal type",
    "logMeal.searchLabel": "Search foods",
    "logMeal.searchPlaceholder": "Search",
    "logMeal.recentTitle": "Recents",
    "logMeal.recentEmpty": "Empty recents",
    "logMeal.searchResultsTitle": "Results",
    "logMeal.searchEmpty": "No foods matched",
    "logMeal.searchFailed": "Search unavailable",
    "logMeal.searching": "Searching…",
    "logMeal.loadFailed": "Couldn't load meal data.",
    "logMeal.retry": "Retry",
    "logMeal.addProduct": "Add product",
    "logMeal.draftTitle": "This meal",
    "logMeal.emptyDraft": "Add foods from search",
    "logMeal.saveMeal": "Save meal",
    "logMeal.savingMeal": "Saving…",
    "logMeal.savedMeal": "Meal saved.",
    "logMeal.saveAsMeal": "Save as meal",
    "logMeal.savedAsMeal": "Template saved.",
    "logMeal.removeItem": "Remove",
    "logMeal.decreaseQuantity": "Decrease quantity",
    "logMeal.increaseQuantity": "Increase quantity",
    "logMeal.savedMealsLink": "Saved meals",
    "logMeal.todayTitle": "Today's totals",
    "logMeal.todayGoal": "of goal",
    "logMeal.protein": "Protein",
    "logMeal.carbs": "Carbs",
    "logMeal.fat": "Fat",
    "logMeal.kcalUnit": "kcal",
    "logMeal.mealTypes.breakfast": "Breakfast",
    "logMeal.mealTypes.lunch": "Lunch",
    "logMeal.mealTypes.dinner": "Dinner",
    "logMeal.mealTypes.snack": "Snack",
    "logMeal.addProductTitle": "Add product",
    "logMeal.addProductSubtitle": "Saved to your library",
    "logMeal.addProductNameLabel": "Product name",
    "logMeal.addProductBrandLabel": "Brand",
    "logMeal.addProductServingLabel": "Serving size",
    "logMeal.addProductCaloriesLabel": "Calories",
    "logMeal.addProductCaloriesUnit": "kcal",
    "logMeal.addProductProteinLabel": "Protein",
    "logMeal.addProductCarbsLabel": "Carbs",
    "logMeal.addProductFatLabel": "Fat",
    "addProduct.addToLog": "Add to log",
    "logMeal.addProductCancel": "Cancel",
    "logMeal.addProductClose": "Close",
    "logMeal.addProductUnitG": "g",
    "logMeal.productDetail.servingSize": "Serving size",
    "logMeal.productDetail.amountGrams": "Amount",
    "logMeal.productDetail.gramsUnit": "g",
    "logMeal.productDetail.decreaseGrams": "Decrease grams",
    "logMeal.productDetail.increaseGrams": "Increase grams",
    "logMeal.productDetail.protein": "Protein",
    "logMeal.productDetail.carbs": "Carbs",
    "logMeal.productDetail.fat": "Fat",
    "logMeal.productDetail.calories": "Calories",
    "logMeal.productDetail.addToMeal": "Add to meal",
    "logMeal.productDetail.close": "Close",
    "logMeal.saveAsMealDialog.title": "Save as meal",
    "logMeal.saveAsMealDialog.subtitle": "Name this meal",
    "logMeal.saveAsMealDialog.nameLabel": "Template name",
    "logMeal.saveAsMealDialog.namePlaceholder": "e.g. Lunch",
    "logMeal.saveAsMealDialog.save": "Save template",
    "logMeal.saveAsMealDialog.saving": "Saving…",
    "logMeal.saveAsMealDialog.cancel": "Cancel",
    "logMeal.saveAsMealDialog.close": "Close",
  }
  return map[key] ?? key
})

describe("LogMealView", () => {
  beforeEach(() => {
    mockSearch.mockReset()
    mockSearch.mockResolvedValue([])
  })

  it("shows empty search messaging when no results", async () => {
    render(<LogMealView initialData={initialData} labels={labels} />)
    const input = screen.getByRole("searchbox", { name: "Search foods" })
    fireEvent.change(input, { target: { value: "zz" } })
    fireEvent.submit(input.closest("form")!)
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled()
      expect(screen.getByText("No foods matched")).toBeInTheDocument()
    })
  })

  it("renders search results from action", async () => {
    mockSearch.mockResolvedValue([yogurt])
    render(<LogMealView initialData={initialData} labels={labels} />)
    const input = screen.getByRole("searchbox", { name: "Search foods" })
    fireEvent.change(input, { target: { value: "greek" } })
    fireEvent.submit(input.closest("form")!)
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith("greek")
      expect(screen.getByText("Results")).toBeInTheDocument()
      expect(screen.getAllByText("Greek Yogurt").length).toBeGreaterThan(0)
    })
  })

  it("instant-adds one serving from + and updates today sidebar totals", async () => {
    render(<LogMealView initialData={initialData} labels={labels} />)
    fireEvent.click(
      screen.getByRole("button", { name: /Add to meal Greek Yogurt/i })
    )
    await waitFor(() => {
      expect(screen.getByText("This meal")).toBeInTheDocument()
      // today 400 + full serving yogurt 240 kcal → 640
      expect(screen.getByText("640")).toBeInTheDocument()
    })
  })

  it("opens product detail when clicking the recent row name", async () => {
    render(<LogMealView initialData={initialData} labels={labels} />)
    fireEvent.click(screen.getByRole("button", { name: /^Greek Yogurt/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })
})
