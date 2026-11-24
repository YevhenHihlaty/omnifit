import { z } from "zod"
import { MEAL_TYPES } from "./types"

const macroSchema = z.number().min(0).max(10000)

export const manualFoodProductCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(120).optional(),
  serving_size_g: macroSchema,
  calories_kcal: macroSchema,
  protein_g: macroSchema.optional(),
  carbs_g: macroSchema.optional(),
  fat_g: macroSchema.optional(),
})

export const mealItemInputSchema = z.object({
  product_id: z.string().uuid(),
  quantity_servings: z.number().positive().max(50),
})

export const logMealSchema = z.object({
  meal_type: z.enum(MEAL_TYPES),
  notes: z.string().trim().max(500).optional(),
  items: z.array(mealItemInputSchema).min(1),
})

export const saveSavedMealSchema = z.object({
  name: z.string().trim().min(1).max(120),
  meal_type: z.enum(MEAL_TYPES),
  items: z.array(mealItemInputSchema).min(1),
})
