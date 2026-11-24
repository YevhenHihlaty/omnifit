/** Centralized route constants — marketing + auth + app paths. */

export const ROUTES = {
  // Marketing
  home: "/",
  pricing: "/pricing",
  privacy: "/privacy",
  terms: "/terms",

  // Auth
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  verifyEmail: "/verify-email",
  resetPasswordUpdate: "/reset-password/update",
  sessionExpired: "/session-expired",
  authCallback: "/auth/callback",

  // Onboarding
  onboardingProfile: "/onboarding/profile",
  onboardingPractice: "/onboarding/practice",

  // App (post-auth)
  dashboard: "/dashboard",
  onboarding: "/onboarding",
  clients: "/clients",
  programs: "/programs",
  sessions: "/sessions",
  messages: "/messages",
  notifications: "/notifications",
  tasks: "/tasks",
  notes: "/notes",
  profile: "/profile",
  profilePlans: "/profile/plans",
  profileCredentials: "/profile/credentials",
  profileLocations: "/profile/locations",
  profileSettings: "/profile/settings",
  billing: "/profile/billing",
  coachSettings: "/profile/settings",
  clientHome: "/home",
  clientLog: "/log",
  clientLogMeal: "/log/meal",
  clientLogMealSaved: "/log/meal/saved",
  clientLogTraining: "/log/training",
  clientLogBody: "/log/body",
  clientCheckin: "/check-in",
  clientProgress: "/progress",
  clientCalendar: "/calendar",
  clientCheckout: "/calendar/checkout",
  receipt: "/receipt",
  clientSettings: "/settings",
  clientMyCoaches: "/settings/coaches",
  inviteClientBase: "/invite/client",
  offline: "/offline",
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]

/** Prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/clients",
  "/programs",
  "/sessions",
  "/messages",
  "/notifications",
  "/tasks",
  "/notes",
  "/profile",
  "/home",
  "/log",
  "/check-in",
  "/progress",
  "/calendar",
  "/receipt",
  "/settings",
] as const

export const clientInvitePath = (token: string) =>
  `${ROUTES.inviteClientBase}/${encodeURIComponent(token)}`

/** Coach client detail page — dynamic route. */
export const coachClientDetail = (clientId: string) =>
  `${ROUTES.clients}/${encodeURIComponent(clientId)}`

export const messageThreadPath = (conversationId: string) =>
  `${ROUTES.messages}/${encodeURIComponent(conversationId)}`

export const messagesWithRelationship = (relationshipId: string) =>
  `${ROUTES.messages}?relationship=${encodeURIComponent(relationshipId)}`

export const clientCheckoutPath = (sessionId: string) =>
  `${ROUTES.clientCheckout}/${encodeURIComponent(sessionId)}`

export const receiptPath = (sessionId: string) =>
  `${ROUTES.receipt}/${encodeURIComponent(sessionId)}`

/** Coach log-training on behalf of a client. */
export const coachClientLogTraining = (
  clientId: string,
  opts?: { templateId?: string }
) => {
  const base = `${coachClientDetail(clientId)}/log-training`
  if (!opts?.templateId) return base
  const params = new URLSearchParams({ template: opts.templateId })
  return `${base}?${params.toString()}`
}

/** Paths that should redirect authenticated users away to dashboard. */
export const AUTH_ONLY_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/session-expired",
] as const
