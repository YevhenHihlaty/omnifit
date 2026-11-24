import { z } from "zod"

const score = z.number().int().min(1).max(5)

export const weeklyCheckinSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleep: score,
  soreness: score,
  stress: score,
  energy: score,
  motivation: score,
  notes: z.string().trim().max(2000).optional(),
})

export type WeeklyCheckinInput = z.infer<typeof weeklyCheckinSchema>
