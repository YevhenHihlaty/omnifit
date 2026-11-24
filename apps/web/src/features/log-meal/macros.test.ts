import { describe, expect, it } from "vitest"
import {
  isProductVisibleToUser,
  scaleProductMacros,
  sumMealDraftTotals,
  sumMealItemMacroRows,
} from "./macros"
import type { FoodProductListItem, MealDraftItem } from "./types"

const catalogProduct: FoodProductListItem = {
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

const privateProduct: FoodProductListItem = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Homemade Oats",
  brand: null,
  servingSizeG: 100,
  caloriesKcal: 150,
  proteinG: 5,
  carbsG: 27,
  fatG: 3,
  source: "user",
  createdBy: "user-a",
  usageCount: 0,
}

describe("scaleProductMacros", () => {
  it("scales macros by quantity servings", () => {
    expect(scaleProductMacros(catalogProduct, 2)).toEqual({
      proteinG: 40,
      carbsG: 16,
      fatG: 20,
      caloriesKcal: 480,
    })
  })
})

describe("sumMealDraftTotals", () => {
  it("sums draft meal totals", () => {
    const items: MealDraftItem[] = [
      { product: catalogProduct, quantityServings: 1 },
      { product: privateProduct, quantityServings: 0.5 },
    ]
    expect(sumMealDraftTotals(items)).toEqual({
      proteinG: 22.5,
      carbsG: 21.5,
      fatG: 11.5,
      caloriesKcal: 315,
    })
  })
})

describe("isProductVisibleToUser — private products", () => {
  it("shows catalog and own private products", () => {
    expect(isProductVisibleToUser(catalogProduct, "user-a")).toBe(true)
    expect(isProductVisibleToUser(privateProduct, "user-a")).toBe(true)
  })

  it("hides another user's private products", () => {
    expect(isProductVisibleToUser(privateProduct, "user-b")).toBe(false)
  })

  it("hides user-source products with null createdBy", () => {
    const orphanUserProduct: FoodProductListItem = {
      ...privateProduct,
      createdBy: null,
    }
    expect(isProductVisibleToUser(orphanUserProduct, "user-a")).toBe(false)
  })
})

describe("sumMealItemMacroRows — home consumed macros", () => {
  it("sums meal_items × products for today intake", () => {
    expect(
      sumMealItemMacroRows([
        {
          quantity_servings: 1,
          product: {
            calories_kcal: 240,
            protein_g: 20,
            carbs_g: 8,
            fat_g: 10,
          },
        },
        {
          quantity_servings: 0.5,
          product: {
            calories_kcal: 150,
            protein_g: 5,
            carbs_g: 27,
            fat_g: 3,
          },
        },
      ])
    ).toEqual({
      caloriesKcal: 315,
      proteinG: 22.5,
      carbsG: 21.5,
      fatG: 11.5,
    })
  })
})
