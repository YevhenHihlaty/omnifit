export type PaymentCollection = "in_app" | "direct"

export type CoachCredentialsSnapshot = {
  yearsExperience: string
  certifications: string
  education: string
  specialtiesText: string
}

export type NotificationPrefs = {
  push: boolean
  emailDigest: boolean
  availableForBooking: boolean
}

export type ServicePlan = {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  priceCents: number
  currency: string
  isPublished: boolean
}

export type CoachProfileHub = {
  displayName: string
  avatarUrl: string | null
  bio: string | null
  specialties: string[]
  paymentCollection: PaymentCollection
  marketplaceVisible: boolean
  stripeAccountId: string | null
  /** none = no account · pending = onboarded but charges not enabled · ready = charges_enabled */
  stripeConnectStatus: "none" | "pending" | "ready"
  personalOrgId: string | null
  personalOrgName: string
  personalOrgSlug: string | null
  credentials: CoachCredentialsSnapshot
  notifications: NotificationPrefs
  tier: string
}

export const emptyCredentials = (): CoachCredentialsSnapshot => ({
  yearsExperience: "",
  certifications: "",
  education: "",
  specialtiesText: "",
})

export const defaultNotifications = (): NotificationPrefs => ({
  push: true,
  emailDigest: true,
  availableForBooking: true,
})

export const parseCredentialsSnapshot = (
  raw: unknown
): CoachCredentialsSnapshot => {
  if (!raw || typeof raw !== "object") return emptyCredentials()
  const obj = raw as Record<string, unknown>
  const credentials =
    obj.credentials && typeof obj.credentials === "object"
      ? (obj.credentials as Record<string, unknown>)
      : obj
  return {
    yearsExperience: String(credentials.yearsExperience ?? credentials.years_experience ?? ""),
    certifications: String(credentials.certifications ?? ""),
    education: String(credentials.education ?? ""),
    specialtiesText: String(
      credentials.specialtiesText ?? credentials.specialties_text ?? ""
    ),
  }
}

export const parseNotificationPrefs = (raw: unknown): NotificationPrefs => {
  const defaults = defaultNotifications()
  if (!raw || typeof raw !== "object") return defaults
  const obj = raw as Record<string, unknown>
  const n =
    obj.notifications && typeof obj.notifications === "object"
      ? (obj.notifications as Record<string, unknown>)
      : null
  if (!n) return defaults
  return {
    push: n.push !== false,
    emailDigest: n.emailDigest !== false && n.email_digest !== false,
    availableForBooking:
      n.availableForBooking !== false && n.available_for_booking !== false,
  }
}

export const formatPlanPrice = (cents: number, currency: string): string => {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}
