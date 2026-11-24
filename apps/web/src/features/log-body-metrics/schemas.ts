import { z } from "zod"
import { PROGRESS_PHOTO_POSES } from "./types"

const optionalCm = z
  .number()
  .positive()
  .max(500)
  .optional()

export const logBodyMetricsSchema = z.object({
  weight_kg: z.number().min(20).max(500),
  chest_cm: optionalCm,
  waist_cm: optionalCm,
  hip_cm: optionalCm,
  arm_cm: optionalCm,
  thigh_cm: optionalCm,
  notes: z.string().trim().max(2000).optional(),
})

export const progressPhotoPoseSchema = z.enum(PROGRESS_PHOTO_POSES)
