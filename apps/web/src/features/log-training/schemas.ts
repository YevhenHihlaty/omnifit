import { z } from "zod"
import { SPORT_TYPES } from "./types"

const optionalPositive = z.number().positive().max(1_000_000).optional()

export const workoutSetSchema = z.object({
  exercise_name: z.string().trim().min(1).max(200),
  sort_order: z.number().int().min(0),
  reps: optionalPositive,
  weight_kg: optionalPositive,
  duration_sec: z.number().int().min(0).max(86_400).optional(),
  distance_m: optionalPositive,
  elevation_m: optionalPositive,
  power_w: optionalPositive,
  cadence_rpm: optionalPositive,
  laps: z.number().int().min(0).max(10_000).optional(),
  stroke: z.string().trim().max(80).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rest_sec: z.number().int().min(0).max(86_400).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const logWorkoutSchema = z.object({
  sport_type: z.enum(SPORT_TYPES),
  duration_sec: z.number().int().positive().max(86_400).optional(),
  notes: z.string().trim().max(2000).optional(),
  sets: z.array(workoutSetSchema).min(1),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().trim().min(1).max(120).optional(),
})

export const saveTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sport_type: z.enum(SPORT_TYPES),
  notes: z.string().trim().max(2000).optional(),
  items: z
    .array(
      z.object({
        exercise_name: z.string().trim().min(1).max(200),
        sort_order: z.number().int().min(0),
        default_sets: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1),
})
