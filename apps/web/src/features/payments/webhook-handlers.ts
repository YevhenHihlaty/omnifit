import type Stripe from "stripe"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import { buildPaymentRowAmounts } from "@/lib/stripe/checkout"
import { sendPaymentReceiptEmails } from "@/features/payments/receipt-emails"

export type WebhookHandleResult =
  | { handled: true; kind: string }
  | { handled: false; reason: string }

const parseCents = (value: string | undefined, fallback = 0): number => {
  if (!value) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

export const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
): Promise<WebhookHandleResult> => {
  const sessionId = session.metadata?.omnifit_session_id
  const coachId = session.metadata?.omnifit_coach_id
  const clientId = session.metadata?.omnifit_client_id
  if (!sessionId || !coachId || !clientId) {
    return { handled: false, reason: "missing_metadata" }
  }

  const sessionPrice = parseCents(session.metadata?.session_price_cents)
  const serviceFeeMeta = parseCents(session.metadata?.service_fee_cents)
  // Infer tier from fee when metadata only has cents
  const tier = serviceFeeMeta === 50 ? "pro" : "free"
  const amounts = buildPaymentRowAmounts(sessionPrice, tier)

  const supabase = createSupabaseServiceClient()
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  const { error: payError } = await supabase.from("payments").upsert(
    {
      session_id: sessionId,
      coach_id: coachId,
      client_id: clientId,
      amount_total: amounts.amountTotal,
      session_price: amounts.sessionPrice,
      service_fee: amounts.serviceFee,
      stripe_fee: amounts.stripeFee,
      net_payout: amounts.netPayout,
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
      status: "succeeded",
      acquisition_fee_charged: false,
    },
    { onConflict: "stripe_checkout_session_id" }
  )

  if (payError) {
    // Unique on payment_intent may collide on retry — treat as idempotent success if session already paid
    const { data: existing } = await supabase
      .from("payments")
      .select("id, status")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle()
    if (!existing || existing.status !== "succeeded") {
      return { handled: false, reason: "payment_upsert_failed" }
    }
  }

  await supabase
    .from("sessions")
    .update({
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
    })
    .eq("id", sessionId)

  await sendPaymentReceiptEmails({
    sessionId,
    coachId,
    clientId,
    sessionPriceCents: amounts.sessionPrice,
    serviceFeeCents: amounts.serviceFee,
    totalCents: amounts.amountTotal,
  })

  return { handled: true, kind: "checkout.session.completed" }
}

export const handleCheckoutSessionExpired = async (
  session: Stripe.Checkout.Session
): Promise<WebhookHandleResult> => {
  const sessionId = session.metadata?.omnifit_session_id
  if (!sessionId) return { handled: false, reason: "missing_metadata" }

  const supabase = createSupabaseServiceClient()
  await supabase
    .from("sessions")
    .update({ payment_status: "awaiting_payment" })
    .eq("id", sessionId)
    .eq("payment_status", "awaiting_payment")

  return { handled: true, kind: "checkout.session.expired" }
}

export const handleChargeRefunded = async (
  charge: Stripe.Charge
): Promise<WebhookHandleResult> => {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id
  if (!paymentIntentId) return { handled: false, reason: "missing_pi" }

  const supabase = createSupabaseServiceClient()
  const { data: payment } = await supabase
    .from("payments")
    .select("id, session_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()

  if (!payment) return { handled: true, kind: "charge.refunded.ignored" }

  await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", payment.id)

  await supabase
    .from("sessions")
    .update({ payment_status: "refunded" })
    .eq("id", payment.session_id)

  return { handled: true, kind: "charge.refunded" }
}

export const handleInvoicePaid = async (
  invoice: Stripe.Invoice
): Promise<WebhookHandleResult> => {
  if (!invoice.id) return { handled: false, reason: "missing_invoice_id" }
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.rpc("mark_acquisition_invoice_paid", {
    p_stripe_invoice_id: invoice.id,
  })
  if (error) return { handled: false, reason: "rpc_failed" }
  const payload = data as { success?: boolean; error?: string }
  if (!payload?.success) {
    // Not an OmniFit acquisition invoice — ignore quietly
    if (payload?.error === "not_found") {
      return { handled: true, kind: "invoice.paid.ignored" }
    }
    return { handled: false, reason: payload?.error ?? "mark_failed" }
  }
  return { handled: true, kind: "invoice.paid" }
}

export const processStripeEvent = async (
  event: Stripe.Event
): Promise<WebhookHandleResult> => {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      )
    case "checkout.session.expired":
      return handleCheckoutSessionExpired(
        event.data.object as Stripe.Checkout.Session
      )
    case "charge.refunded":
      return handleChargeRefunded(event.data.object as Stripe.Charge)
    case "invoice.paid":
      return handleInvoicePaid(event.data.object as Stripe.Invoice)
    default:
      return { handled: true, kind: `ignored:${event.type}` }
  }
}
