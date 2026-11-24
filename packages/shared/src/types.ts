export type UserRole = "coach" | "client"

export const USER_ROLES = ["coach", "client"] as const satisfies readonly UserRole[]

export type SubscriptionTier = "free" | "pro"
export type BillingStatus = "active" | "past_due" | "canceled" | "trial"

export type CoachProfile = {
  id: string
  userId: string
  displayName: string
  bio: string | null
  specialties: string[]
  subscriptionTier: SubscriptionTier
  stripeAccountId: string | null
  stripeCustomerId: string | null
  personalOrgId: string
  currentOrgId: string
}

export type ClientProfile = {
  id: string
  userId: string
  displayName: string
  goalType: "weight_loss" | "muscle_gain" | "general_conditioning" | "other"
  acquisitionSource: "coach_invited" | "platform_sourced"
}

export type CoachClientRelationship = {
  id: string
  coachId: string
  clientId: string
  orgId: string
  status: "active" | "archived"
  acquisitionSource: "coach_invited" | "platform_sourced"
  acquisitionFeePaidAt: string | null
}

export type Session = {
  id: string
  coachId: string
  clientId: string
  scheduledAt: string
  durationMin: number
  status: "pending" | "confirmed" | "completed" | "canceled"
  priceAmount: number | null
  paymentStatus: "unpaid" | "paid" | "refunded" | null
}

export type Payment = {
  id: string
  sessionId: string
  coachId: string
  clientId: string
  amountTotal: number
  serviceFee: number
  stripeFee: number
  netPayout: number
  stripePaymentIntentId: string
  status: "pending" | "succeeded" | "failed" | "refunded"
  acquisitionFeeCharged: boolean
}
