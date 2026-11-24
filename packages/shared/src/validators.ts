import { z } from "zod"

// E.164 per migration 098 constraint: ^\+[1-9]\d{7,14}$
const PHONE_E164_RE = /^\+[1-9]\d{7,14}$/

export const coachSignupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    displayName: z.string().min(1).max(80),
    phone: z.string().regex(PHONE_E164_RE, "Phone must be E.164 format"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const resetRequestSchema = z.object({
  email: z.string().email(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8),
})

export const inviteClientByEmailSchema = z.object({
  email: z.string().email(),
  originSessionId: z.string().uuid().optional(),
  originSeriesId: z.string().uuid().optional(),
})

/** @deprecated Use inviteClientByEmailSchema */
export const inviteClientSchema = inviteClientByEmailSchema.pick({ email: true })

export const completeClientInviteSchema = z
  .object({
    token: z.string().trim().min(1, "Invite link is invalid"),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    disclosureConfirmed: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type InviteClientByEmailInput = z.infer<typeof inviteClientByEmailSchema>
export type CompleteClientInviteInput = z.infer<typeof completeClientInviteSchema>

export const createSessionSchema = z.object({
  clientId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(240),
  priceAmount: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
})

export const checkoutSessionSchema = z.object({
  sessionId: z.string().uuid(),
})
