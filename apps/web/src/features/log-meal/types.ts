/** Log-meal domain types for OmniFit web. */

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const

export type MealType = (typeof MEAL_TYPES)[number]

export type FoodProductSource = "seed" | "off" | "user"

export type MacroTotals = {
  proteinG: number
  carbsG: number
  fatG: number
  caloriesKcal: number
}

export type FoodProductListItem = {
  id: string
  name: string
  brand: string | null
  servingSizeG: number | null
  caloriesKcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  source: FoodProductSource
  createdBy: string | null
  usageCount: number
}

/** Macros-only slice for scaling — callers need not supply full list items. */
export type ProductMacroSource = Pick<
  FoodProductListItem,
  "caloriesKcal" | "proteinG" | "carbsG" | "fatG"
>

export type MealDraftItem = {
  product: FoodProductListItem
  quantityServings: number
}

export type MealDraft = {
  mealType: MealType
  items: MealDraftItem[]
  notes?: string
}

export type LogMealPageData = {
  recents: FoodProductListItem[]
  defaultMealType: MealType
  todayTotals: MacroTotals
  targetKcal: number | null
  targetProteinG: number | null
  targetCarbsG: number | null
  targetFatG: number | null
}

export type SavedMealMacroTotals = MacroTotals

export type SavedMealListItem = {
  id: string
  name: string
  macros: SavedMealMacroTotals
  mealType: MealType | null
  lastUsedAt: string | null
}

export type FoodProductDbRow = {
  id: string
  name: string
  brand: string | null
  serving_size_g: number | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  source: FoodProductSource
  created_by: string | null
  usage_count?: number | null
}
