"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import {
  createConnectOnboardingLink,
  ensureConnectAccount,
  isConnectChargesReady,
} from "@/lib/stripe/connect"
import { createSessionCheckout } from "@/lib/stripe/checkout"
import { stripeSessionCheckoutEnabled } from "@/lib/feature-flags"

export type StripeActionResult =
  | { success: true; url?: string }
  | { success: false; error: string }

export const startStripeConnectOnboarding = async (): Promise<StripeActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const [{ data: profile }, { data: coach }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("coach_profiles")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  if (!coach) return { success: false, error: "coach_profile_incomplete" }

  let accountId: string
  try {
    const ensured = await ensureConnectAccount({
      existingAccountId: coach.stripe_account_id,
      email: profile?.email ?? user.email ?? "",
      displayName: profile?.display_name ?? "Coach",
    })
    accountId = ensured.accountId
  } catch {
    return { success: false, error: "connect_failed" }
  }

  if (accountId !== coach.stripe_account_id) {
    const { error } = await supabase
      .from("coach_profiles")
      .update({ stripe_account_id: accountId })
      .eq("user_id", user.id)
    if (error) return { success: false, error: "update_failed" }
  }

  let url: string
  try {
    const link = await createConnectOnboardingLink(accountId)
    url = link.url
  } catch {
    return { success: false, error: "connect_failed" }
  }

  redirect(url)
}

export const markSessionPaidOffline = async (
  sessionId: string
): Promise<StripeActionResult> => {
  if (!sessionId.trim()) return { success: false, error: "not_found" }
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("mark_session_paid_offline", {
    p_session_id: sessionId,
  })
  if (error) return { success: false, error: "update_failed" }
  const payload = data as { success?: boolean; error?: string }
  if (!payload?.success) {
    return { success: false, error: payload?.error ?? "update_failed" }
  }
  revalidatePath(ROUTES.sessions)
  revalidatePath(ROUTES.clientCalendar)
  return { success: true }
}

export const createSessionPaymentCheckout = async (
  sessionId: string
): Promise<StripeActionResult> => {
  if (!stripeSessionCheckoutEnabled()) {
    return { success: false, error: "checkout_disabled" }
  }
  if (!sessionId.trim()) return { success: false, error: "not_found" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id, coach_id, client_id, title, price_amount, payment_status, stripe_checkout_session_id"
    )
    .eq("id", sessionId)
    .maybeSingle()

  if (sessionError || !session) return { success: false, error: "not_found" }
  if (session.client_id !== user.id) return { success: false, error: "forbidden" }
  if (session.payment_status !== "awaiting_payment") {
    return { success: false, error: "not_payable" }
  }

  const price = session.price_amount
  if (typeof price !== "number" || price <= 0) {
    return { success: false, error: "missing_price" }
  }

  const [{ data: coach }, { data: profile }] = await Promise.all([
    supabase
      .from("coach_profiles")
      .select("stripe_account_id, personal_subscription_tier, payment_collection")
      .eq("user_id", session.coach_id)
      .maybeSingle(),
    supabase.from("profiles").select("email").eq("id", user.id).maybeSingle(),
  ])

  if (!coach?.stripe_account_id || coach.payment_collection !== "in_app") {
    return { success: false, error: "stripe_required" }
  }

  let checkoutUrl: string
  let checkoutSessionId: string
  try {
    const ready = await isConnectChargesReady(coach.stripe_account_id)
    if (!ready) return { success: false, error: "stripe_not_ready" }

    const checkout = await createSessionCheckout({
      sessionId: session.id,
      coachStripeAccountId: coach.stripe_account_id,
      sessionPriceCents: price,
      coachTier: String(coach.personal_subscription_tier ?? "free"),
      clientEmail: profile?.email ?? user.email ?? "",
      clientUserId: user.id,
      coachUserId: session.coach_id,
      sessionTitle: session.title ?? "Coaching session",
    })
    checkoutUrl = checkout.checkoutUrl
    checkoutSessionId = checkout.checkoutSessionId
  } catch {
    return { success: false, error: "checkout_failed" }
  }

  await supabase
    .from("sessions")
    .update({ stripe_checkout_session_id: checkoutSessionId })
    .eq("id", session.id)
    .eq("client_id", user.id)

  redirect(checkoutUrl)
}
