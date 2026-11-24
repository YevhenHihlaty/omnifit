import { getStripe } from "@/lib/stripe/client"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import { handleCheckoutSessionCompleted } from "@/features/payments/webhook-handlers"

/**
 * After Stripe redirects to success_url, webhook may lag.
 * Reconcile by retrieving the Checkout Session on the connected account.
 */
export const reconcilePaidCheckout = async (input: {
  omnifitSessionId: string
  stripeCheckoutSessionId?: string | null
}): Promise<{ paid: boolean }> => {
  let supabase
  try {
    supabase = createSupabaseServiceClient()
  } catch {
    return { paid: false }
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, payment_status, stripe_checkout_session_id, coach_id")
    .eq("id", input.omnifitSessionId)
    .maybeSingle()

  if (!session) return { paid: false }
  if (
    session.payment_status === "paid" ||
    session.payment_status === "paid_offline"
  ) {
    return { paid: true }
  }

  const checkoutId =
    input.stripeCheckoutSessionId?.trim() ||
    (session.stripe_checkout_session_id as string | null)
  if (!checkoutId) return { paid: false }

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("stripe_account_id")
    .eq("user_id", session.coach_id)
    .maybeSingle()

  if (!coach?.stripe_account_id) return { paid: false }

  try {
    const stripe = getStripe()
    const checkout = await stripe.checkout.sessions.retrieve(
      checkoutId,
      {},
      { stripeAccount: coach.stripe_account_id }
    )
    if (checkout.status !== "complete" && checkout.payment_status !== "paid") {
      return { paid: false }
    }
    await handleCheckoutSessionCompleted(checkout)
    return { paid: true }
  } catch {
    return { paid: false }
  }
}
