import { LOG_MEAL_RECENTS_LIMIT } from "./constants"
import type {
  FoodProductDbRow,
  FoodProductListItem,
  MacroTotals,
  MealDraftItem,
  MealType,
  ProductMacroSource,
  SavedMealListItem,
  SavedMealMacroTotals,
} from "./types"

const roundMacro = (value: number) => Math.round(value * 10) / 10

export const scaleProductMacros = (
  product: ProductMacroSource,
  quantityServings: number
): MacroTotals => ({
  proteinG: roundMacro((product.proteinG ?? 0) * quantityServings),
  carbsG: roundMacro((product.carbsG ?? 0) * quantityServings),
  fatG: roundMacro((product.fatG ?? 0) * quantityServings),
  caloriesKcal: roundMacro((product.caloriesKcal ?? 0) * quantityServings),
})

export const sumMealDraftTotals = (items: MealDraftItem[]): MacroTotals =>
  items.reduce(
    (totals, item) => {
      const scaled = scaleProductMacros(item.product, item.quantityServings)
      return {
        proteinG: roundMacro(totals.proteinG + scaled.proteinG),
        carbsG: roundMacro(totals.carbsG + scaled.carbsG),
        fatG: roundMacro(totals.fatG + scaled.fatG),
        caloriesKcal: roundMacro(totals.caloriesKcal + scaled.caloriesKcal),
      }
    },
    { proteinG: 0, carbsG: 0, fatG: 0, caloriesKcal: 0 }
  )

export const emptyMacroTotals = (): MacroTotals => ({
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  caloriesKcal: 0,
})

export const formatServingLabel = (servingSizeG: number | null): string =>
  servingSizeG ? `${servingSizeG}g serving` : "1 serving"

export const isProductVisibleToUser = (
  product: FoodProductListItem,
  userId: string
): boolean =>
  product.source !== "user" || product.createdBy === userId

export const mapFoodProductRow = (row: FoodProductDbRow): FoodProductListItem => ({
  id: row.id,
  name: row.name,
  brand: row.brand,
  servingSizeG: row.serving_size_g,
  caloriesKcal: row.calories_kcal,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatG: row.fat_g,
  source: row.source,
  createdBy: row.created_by,
  usageCount: row.usage_count ?? 0,
})

export const defaultMealTypeForHour = (hour: number): MealType => {
  if (hour < 11) return "breakfast"
  if (hour < 15) return "lunch"
  if (hour < 21) return "dinner"
  return "snack"
}

export const prependFoodProductsToRecents = (
  current: FoodProductListItem[],
  products: FoodProductListItem[],
  limit = LOG_MEAL_RECENTS_LIMIT
): FoodProductListItem[] => {
  if (products.length === 0) return current

  const seen = new Set<string>()
  const prepended: FoodProductListItem[] = []

  for (const product of products) {
    if (seen.has(product.id)) continue
    seen.add(product.id)
    prepended.push(product)
  }

  const prependedIds = new Set(prepended.map((product) => product.id))
  const rest = current.filter((product) => !prependedIds.has(product.id))

  return [...prepended, ...rest].slice(0, limit)
}

type FoodProductMacroRow = {
  serving_size_g: number | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

type SavedMealItemRow = {
  quantity_servings: number
  product: FoodProductMacroRow | null
}

export type SavedMealListRow = {
  id: string
  name: string
  meal_type: MealType | null
  last_used_at: string | null
  saved_meal_items: SavedMealItemRow[] | null
}

export const sumSavedMealMacros = (
  items: SavedMealItemRow[]
): SavedMealMacroTotals =>
  items.reduce<SavedMealMacroTotals>(
    (totals, item) => {
      const product = item.product
      if (!product) return totals
      const qty = Number(item.quantity_servings) || 0
      return {
        caloriesKcal: totals.caloriesKcal + (product.calories_kcal ?? 0) * qty,
        proteinG: totals.proteinG + (product.protein_g ?? 0) * qty,
        carbsG: totals.carbsG + (product.carbs_g ?? 0) * qty,
        fatG: totals.fatG + (product.fat_g ?? 0) * qty,
      }
    },
    emptyMacroTotals()
  )

export const mapSavedMealListRow = (row: SavedMealListRow): SavedMealListItem => {
  const items = row.saved_meal_items ?? []
  const macros = sumSavedMealMacros(items)

  return {
    id: row.id,
    name: row.name,
    mealType: row.meal_type,
    lastUsedAt: row.last_used_at,
    macros: {
      caloriesKcal: Math.round(macros.caloriesKcal),
      proteinG: roundMacro(macros.proteinG),
      carbsG: roundMacro(macros.carbsG),
      fatG: roundMacro(macros.fatG),
    },
  }
}

export const formatSavedMealMacroSummary = (macros: SavedMealMacroTotals): string => {
  const kcal = Math.round(macros.caloriesKcal)
  const protein = roundMacro(macros.proteinG)
  const carbs = roundMacro(macros.carbsG)
  const fat = roundMacro(macros.fatG)
  return `${kcal} kcal · ${protein}g P · ${carbs}g C · ${fat}g F`
}

/** Sum scaled macros from meal_items × products rows (home / today totals). */
export type MealItemMacroRow = {
  quantity_servings: number
  product: {
    calories_kcal: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
  } | null
}

export const sumMealItemMacroRows = (items: MealItemMacroRow[]): MacroTotals => {
  const raw = items.reduce(
    (totals, item) => {
      const product = item.product
      if (!product) return totals
      const qty = Number(item.quantity_servings) || 0
      return {
        caloriesKcal: totals.caloriesKcal + (product.calories_kcal ?? 0) * qty,
        proteinG: totals.proteinG + (product.protein_g ?? 0) * qty,
        carbsG: totals.carbsG + (product.carbs_g ?? 0) * qty,
        fatG: totals.fatG + (product.fat_g ?? 0) * qty,
      }
    },
    emptyMacroTotals()
  )

  return {
    caloriesKcal: Math.round(raw.caloriesKcal),
    proteinG: roundMacro(raw.proteinG),
    carbsG: roundMacro(raw.carbsG),
    fatG: roundMacro(raw.fatG),
  }
}
