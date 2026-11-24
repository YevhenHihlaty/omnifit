"use server"

import { toCalendarDateIso } from "@/features/client-home/calendar-date"
import { listClientCoachesForUser } from "@/features/client-settings/list-client-coaches"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  defaultMealTypeForHour,
  emptyMacroTotals,
  isProductVisibleToUser,
  mapFoodProductRow,
  mapSavedMealListRow,
  sumMealItemMacroRows,
  type MealItemMacroRow,
  type SavedMealListRow,
} from "./macros"
import {
  isFoodSearchQueryValid,
  normalizeFoodSearchTerm,
} from "./search"
import type {
  FoodProductDbRow,
  FoodProductListItem,
  LogMealPageData,
  MacroTotals,
  SavedMealListItem,
} from "./types"

const PRODUCT_SELECT =
  "id, name, brand, serving_size_g, calories_kcal, protein_g, carbs_g, fat_g, source, created_by, usage_count"

const MEAL_ITEM_PRODUCT_SELECT = `
  calories_kcal,
  protein_g,
  carbs_g,
  fat_g
`

const SAVED_MEAL_SELECT = `
  id,
  name,
  meal_type,
  last_used_at,
  saved_meal_items (
    quantity_servings,
    product:food_products (
      serving_size_g,
      calories_kcal,
      protein_g,
      carbs_g,
      fat_g
    )
  )
`

/** Hour 0–23 in IANA `tz` (handles Intl "24" → 0). */
export const hourInTimeZone = (date: Date, tz: string): number => {
  try {
    const raw = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(date)
    const hour = Number(raw)
    if (hour === 24) return 0
    return Number.isFinite(hour) ? hour : date.getHours()
  } catch {
    return date.getHours()
  }
}

const emptyLogMealPageData = (tz = "UTC"): LogMealPageData => ({
  recents: [],
  defaultMealType: defaultMealTypeForHour(hourInTimeZone(new Date(), tz)),
  todayTotals: emptyMacroTotals(),
  targetKcal: null,
  targetProteinG: null,
  targetCarbsG: null,
  targetFatG: null,
})

/** ponytail: 48h window + calendar-date filter — avoids fragile TZ offset math. */
const recentMealsWindowStartIso = (): string =>
  new Date(Date.now() - 48 * 3600_000).toISOString()

export const getTodayMealTotals = async (
  clientId: string,
  tz = "UTC"
): Promise<MacroTotals> => {
  const supabase = await createSupabaseServerClient()
  const todayIso = toCalendarDateIso(new Date(), tz)

  const { data, error } = await supabase
    .from("meals")
    .select(
      `
      logged_at,
      meal_items (
        quantity_servings,
        product:food_products (${MEAL_ITEM_PRODUCT_SELECT})
      )
    `
    )
    .eq("client_id", clientId)
    .gte("logged_at", recentMealsWindowStartIso())

  if (error || !data) return emptyMacroTotals()

  const items: MealItemMacroRow[] = []
  for (const meal of data) {
    const row = meal as Record<string, unknown>
    const loggedAt = String(row.logged_at ?? "")
    if (!loggedAt) continue
    if (toCalendarDateIso(new Date(loggedAt), tz) !== todayIso) continue
    const mealItems = Array.isArray(row.meal_items)
      ? (row.meal_items as MealItemMacroRow[])
      : []
    for (const item of mealItems) items.push(item)
  }

  return sumMealItemMacroRows(items)
}

export const loadLogMealPageData = async (
  clientId: string,
  tz = "UTC"
): Promise<{ data: LogMealPageData; loadFailed: boolean }> => {
  try {
    const supabase = await createSupabaseServerClient()
    const now = new Date()
    const localHour = hourInTimeZone(now, tz)
    const coaches = await listClientCoachesForUser()
    // Match client-home focused default: first coach in list order
    const preferredCoachId = coaches[0]?.coachId ?? null

    const loadTargets = async () => {
      if (preferredCoachId) {
        const preferred = await supabase
          .from("client_nutrition_targets")
          .select("calories_kcal, protein_g, carbs_g, fat_g, coach_id, updated_at")
          .eq("client_id", clientId)
          .eq("coach_id", preferredCoachId)
          .maybeSingle()
        if (preferred.data) return preferred
      }
      return supabase
        .from("client_nutrition_targets")
        .select("calories_kcal, protein_g, carbs_g, fat_g, coach_id, updated_at")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    }

    const [mealsRes, todayTotals, targetRes] = await Promise.all([
      supabase
        .from("meals")
        .select("id")
        .eq("client_id", clientId)
        .order("logged_at", { ascending: false })
        .limit(15),
      getTodayMealTotals(clientId, tz),
      loadTargets(),
    ])

    if (mealsRes.error) {
      return { data: emptyLogMealPageData(tz), loadFailed: true }
    }

    const mealIds = (mealsRes.data ?? []).map((m) => m.id as string)
    const recents: FoodProductListItem[] = []

    if (mealIds.length > 0) {
      const { data: recentItems, error: itemsError } = await supabase
        .from("meal_items")
        .select(`created_at, product:food_products (${PRODUCT_SELECT})`)
        .in("meal_id", mealIds)
        .order("created_at", { ascending: false })
        .limit(40)

      if (itemsError) {
        return {
          data: {
            ...emptyLogMealPageData(tz),
            todayTotals,
            defaultMealType: defaultMealTypeForHour(localHour),
          },
          loadFailed: true,
        }
      }

      const seen = new Set<string>()
      for (const row of recentItems ?? []) {
        const product = (row as Record<string, unknown>).product as
          | Record<string, unknown>
          | null
        if (!product || typeof product.id !== "string") continue
        if (seen.has(product.id)) continue
        seen.add(product.id)
        recents.push(
          mapFoodProductRow({
            id: product.id,
            name: String(product.name),
            brand: (product.brand as string | null) ?? null,
            serving_size_g: (product.serving_size_g as number | null) ?? null,
            calories_kcal: (product.calories_kcal as number | null) ?? null,
            protein_g: (product.protein_g as number | null) ?? null,
            carbs_g: (product.carbs_g as number | null) ?? null,
            fat_g: (product.fat_g as number | null) ?? null,
            source: product.source as FoodProductListItem["source"],
            created_by: (product.created_by as string | null) ?? null,
            usage_count: (product.usage_count as number | null) ?? 0,
          })
        )
        if (recents.length >= 20) break
      }
    }

    let targetRow = targetRes.data as Record<string, unknown> | null

    const toTarget = (value: unknown): number | null =>
      value != null && Number.isFinite(Number(value)) ? Number(value) : null

    const targetKcal = toTarget(targetRow?.calories_kcal)
    const targetProteinG = toTarget(targetRow?.protein_g)
    const targetCarbsG = toTarget(targetRow?.carbs_g)
    const targetFatG = toTarget(targetRow?.fat_g)

    return {
      data: {
        recents,
        defaultMealType: defaultMealTypeForHour(localHour),
        todayTotals,
        targetKcal,
        targetProteinG,
        targetCarbsG,
        targetFatG,
      },
      loadFailed: false,
    }
  } catch {
    return { data: emptyLogMealPageData(tz), loadFailed: true }
  }
}

export const searchFoodProducts = async (
  query: string,
  userId: string
): Promise<FoodProductListItem[]> => {
  const supabase = await createSupabaseServerClient()
  const term = normalizeFoodSearchTerm(query)
  if (!isFoodSearchQueryValid(term)) return []

  const { data, error } = await supabase.rpc("search_food_products", { q: term })
  if (error) throw error

  return ((data ?? []) as FoodProductDbRow[])
    .map((row) => mapFoodProductRow(row))
    .filter((product) => isProductVisibleToUser(product, userId))
}

export const getFoodProductById = async (
  productId: string,
  userId: string
): Promise<FoodProductListItem | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("food_products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle()

  if (error || !data) return null
  const product = mapFoodProductRow(data as FoodProductDbRow)
  return isProductVisibleToUser(product, userId) ? product : null
}

export const incrementFoodProductUsage = async (productId: string) => {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc("increment_food_product_usage_count", {
    p_product_id: productId,
  })
  if (error) throw error
}

export const listSavedMeals = async (
  ownerId: string
): Promise<{ meals: SavedMealListItem[]; loadFailed: boolean }> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from("saved_meals")
      .select(SAVED_MEAL_SELECT)
      .eq("owner_id", ownerId)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })

    if (error) return { meals: [], loadFailed: true }

    return {
      meals: ((data ?? []) as unknown as SavedMealListRow[]).map(
        mapSavedMealListRow
      ),
      loadFailed: false,
    }
  } catch {
    return { meals: [], loadFailed: true }
  }
}
