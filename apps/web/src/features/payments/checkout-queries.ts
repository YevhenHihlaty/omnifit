import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isConnectChargesReady } from "@/lib/stripe/connect"
import {
  clientTotal,
  formatUsdFromCents,
  platformServiceFeeCents,
  coachNetPayout,
} from "@omnifit/shared"

export type StripeConnectStatus = "none" | "pending" | "ready"

/** Honest Connect status: account id alone is not “connected” for payouts. */
export const getStripeConnectStatus = async (
  stripeAccountId: string | null | undefined
): Promise<StripeConnectStatus> => {
  if (!stripeAccountId) return "none"
  try {
    const ready = await isConnectChargesReady(stripeAccountId)
    return ready ? "ready" : "pending"
  } catch {
    return "pending"
  }
}

export type CheckoutSessionView = {
  sessionId: string
  title: string
  coachName: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  sessionPriceCents: number
  serviceFeeCents: number
  totalCents: number
  paymentStatus: string
}

export const loadClientCheckoutSession = async (
  sessionId: string
): Promise<CheckoutSessionView | null> => {
  if (!sessionId.trim()) return null
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from("sessions")
    .select(
      `
      id,
      title,
      starts_at,
      ends_at,
      duration_minutes,
      price_amount,
      payment_status,
      coach_id,
      coach:profiles!sessions_coach_id_fkey(display_name, email)
    `
    )
    .eq("id", sessionId)
    .eq("client_id", user.id)
    .maybeSingle()

  if (!session) return null

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("personal_subscription_tier")
    .eq("user_id", session.coach_id)
    .maybeSingle()

  const coachProfile = Array.isArray(session.coach)
    ? session.coach[0]
    : session.coach
  const coachName =
    (coachProfile as { display_name?: string | null; email?: string | null } | null)
      ?.display_name?.trim() ||
    (coachProfile as { email?: string | null } | null)?.email?.split("@")[0] ||
    "Coach"

  const sessionPrice = Number(session.price_amount ?? 0)
  const tier = String(coach?.personal_subscription_tier ?? "free")
  const serviceFee = platformServiceFeeCents(tier)

  return {
    sessionId: session.id as string,
    title: (session.title as string) || "Session",
    coachName,
    startsAt: session.starts_at as string,
    endsAt: session.ends_at as string,
    durationMinutes: Number(session.duration_minutes ?? 0),
    sessionPriceCents: sessionPrice,
    serviceFeeCents: serviceFee,
    totalCents: clientTotal(sessionPrice, tier),
    paymentStatus: String(session.payment_status ?? ""),
  }
}

export type ReceiptView = {
  sessionId: string
  title: string
  counterpartName: string
  startsAt: string
  endsAt: string
  sessionPriceCents: number
  serviceFeeCents: number
  totalCents: number
  stripeFeeCents: number
  netPayoutCents: number
  role: "client" | "coach"
  paymentStatus: string
  paidOffline: boolean
}

export const loadPaymentReceipt = async (
  sessionId: string
): Promise<ReceiptView | null> => {
  if (!sessionId.trim()) return null
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from("sessions")
    .select(
      `
      id,
      title,
      starts_at,
      ends_at,
      price_amount,
      payment_status,
      coach_id,
      client_id,
      coach:profiles!sessions_coach_id_fkey(display_name, email),
      client:profiles!sessions_client_id_fkey(display_name, email)
    `
    )
    .eq("id", sessionId)
    .maybeSingle()

  if (!session) return null
  if (session.coach_id !== user.id && session.client_id !== user.id) {
    return null
  }

  const role = session.client_id === user.id ? "client" : "coach"
  const counterpart =
    role === "client"
      ? (Array.isArray(session.coach) ? session.coach[0] : session.coach)
      : (Array.isArray(session.client) ? session.client[0] : session.client)
  const counterpartName =
    (counterpart as { display_name?: string | null } | null)?.display_name?.trim() ||
    (counterpart as { email?: string | null } | null)?.email?.split("@")[0] ||
    (role === "client" ? "Coach" : "Client")

  const { data: payment } = await supabase
    .from("payments")
    .select("session_price, service_fee, amount_total, stripe_fee, net_payout")
    .eq("session_id", sessionId)
    .eq("status", "succeeded")
    .maybeSingle()

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("personal_subscription_tier")
    .eq("user_id", session.coach_id)
    .maybeSingle()

  const tier = String(coach?.personal_subscription_tier ?? "free")
  const sessionPrice =
    payment?.session_price ?? Number(session.price_amount ?? 0)
  const isOffline = String(session.payment_status) === "paid_offline"
  const amounts = coachNetPayout(Number(sessionPrice), tier)

  return {
    sessionId: session.id as string,
    title: (session.title as string) || "Session",
    counterpartName,
    startsAt: session.starts_at as string,
    endsAt: session.ends_at as string,
    sessionPriceCents: Number(sessionPrice),
    serviceFeeCents: isOffline
      ? 0
      : (payment?.service_fee ?? amounts.serviceFee),
    totalCents: isOffline
      ? Number(sessionPrice)
      : (payment?.amount_total ?? Number(sessionPrice) + amounts.serviceFee),
    stripeFeeCents: isOffline ? 0 : (payment?.stripe_fee ?? amounts.stripeFee),
    netPayoutCents: isOffline
      ? Number(sessionPrice)
      : (payment?.net_payout ?? amounts.netPayout),
    role,
    paymentStatus: String(session.payment_status ?? ""),
    paidOffline: isOffline,
  }
}

export { formatUsdFromCents }
