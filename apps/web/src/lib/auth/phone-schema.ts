import { z } from "zod"

/** Matches migration 098 CHECK: ^\+[1-9]\d{7,14}$ (8–15 digits after +). */
export const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format (e.g. +15551234567)")

export type E164Phone = z.infer<typeof e164PhoneSchema>
