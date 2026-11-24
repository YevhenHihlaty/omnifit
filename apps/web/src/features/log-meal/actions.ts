"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { mapFoodProductRow } from "./macros"
import {
  incrementFoodProductUsage,
  searchFoodProducts,
} from "./queries"
import {
  logMealSchema,
  manualFoodProductCreateSchema,
  saveSavedMealSchema,
} from "./schemas"
import type { FoodProductListItem, MealType } from "./types"

export type ActionResult =
  | { success: true; product?: FoodProductListItem }
  | { success: false; error: string }

export const createManualProduct = async (
  input: unknown
): Promise<ActionResult> => {
  const parsed = manualFoodProductCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data, error } = await supabase
    .from("food_products")
    .insert({
      name: parsed.data.name,
      brand: parsed.data.brand ?? null,
      serving_size_g: parsed.data.serving_size_g,
      calories_kcal: parsed.data.calories_kcal,
      protein_g: parsed.data.protein_g ?? null,
      carbs_g: parsed.data.carbs_g ?? null,
      fat_g: parsed.data.fat_g ?? null,
      source: "user",
      created_by: user.id,
    })
    .select(
      "id, name, brand, serving_size_g, calories_kcal, protein_g, carbs_g, fat_g, source, created_by, usage_count"
    )
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.clientLogMeal)
  return { success: true, product: mapFoodProductRow(data) }
}

export const createMealWithItems = async (input: {
  mealType: MealType
  notes?: string
  items: { productId: string; quantityServings: number }[]
}): Promise<ActionResult> => {
  const parsed = logMealSchema.safeParse({
    meal_type: input.mealType,
    notes: input.notes,
    items: input.items.map((item) => ({
      product_id: item.productId,
      quantity_servings: item.quantityServings,
    })),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert({
      client_id: user.id,
      meal_type: parsed.data.meal_type,
      notes: parsed.data.notes ?? null,
      logged_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (mealError || !meal) {
    return { success: false, error: mealError?.message ?? "Could not save meal" }
  }

  const { error: itemsError } = await supabase.from("meal_items").insert(
    parsed.data.items.map((item) => ({
      meal_id: meal.id,
      product_id: item.product_id,
      quantity_servings: item.quantity_servings,
    }))
  )

  if (itemsError) {
    await supabase
      .from("meals")
      .delete()
      .eq("id", meal.id)
      .eq("client_id", user.id)
    return { success: false, error: itemsError.message }
  }

  revalidatePath(ROUTES.clientLogMeal)
  revalidatePath(ROUTES.clientHome)
  return { success: true }
}

export const searchProductsAction = async (query: string) => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  return searchFoodProducts(query, user.id)
}

export const incrementUsage = async (productId: string) => {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await incrementFoodProductUsage(productId)
  } catch {
    // Ranking is best-effort
  }
}

export const saveAsMeal = async (input: {
  name: string
  mealType: MealType
  items: { productId: string; quantityServings: number }[]
}): Promise<ActionResult> => {
  const parsed = saveSavedMealSchema.safeParse({
    name: input.name,
    meal_type: input.mealType,
    items: input.items.map((item) => ({
      product_id: item.productId,
      quantity_servings: item.quantityServings,
    })),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: savedMeal, error: mealError } = await supabase
    .from("saved_meals")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      meal_type: parsed.data.meal_type,
    })
    .select("id")
    .single()

  if (mealError || !savedMeal) {
    return {
      success: false,
      error: mealError?.message ?? "Could not save meal template",
    }
  }

  const { error: itemsError } = await supabase.from("saved_meal_items").insert(
    parsed.data.items.map((item, index) => ({
      saved_meal_id: savedMeal.id,
      product_id: item.product_id,
      quantity_servings: item.quantity_servings,
      sort_order: index,
    }))
  )

  if (itemsError) {
    await supabase
      .from("saved_meals")
      .delete()
      .eq("id", savedMeal.id)
      .eq("owner_id", user.id)
    return { success: false, error: itemsError.message }
  }

  revalidatePath(ROUTES.clientLogMealSaved)
  revalidatePath(ROUTES.clientLogMeal)
  return { success: true }
}

export const logSavedMeal = async (savedMealId: string): Promise<ActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: savedMeal, error: mealError } = await supabase
    .from("saved_meals")
    .select("id, meal_type")
    .eq("id", savedMealId)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (mealError || !savedMeal) {
    return { success: false, error: mealError?.message ?? "Saved meal not found" }
  }

  const { data: items, error: itemsError } = await supabase
    .from("saved_meal_items")
    .select("product_id, quantity_servings")
    .eq("saved_meal_id", savedMealId)
    .order("sort_order", { ascending: true })

  if (itemsError) return { success: false, error: itemsError.message }
  if (!items || items.length === 0) {
    return { success: false, error: "Saved meal has no items" }
  }

  const mealType = (savedMeal.meal_type as MealType | null) ?? "lunch"
  const result = await createMealWithItems({
    mealType,
    items: items.map((item) => ({
      productId: item.product_id as string,
      quantityServings: Number(item.quantity_servings),
    })),
  })

  if (!result.success) return result

  await supabase
    .from("saved_meals")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", savedMealId)
    .eq("owner_id", user.id)

  revalidatePath(ROUTES.clientLogMealSaved)
  revalidatePath(ROUTES.clientHome)
  return { success: true }
}
