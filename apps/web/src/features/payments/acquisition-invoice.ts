import { ACQUISITION_FEE_CENTS } from "@omnifit/shared"
import { getStripe } from "@/lib/stripe/client"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import { sendAcquisitionInvoiceEmail } from "./receipt-emails"

/**
 * Create a Stripe Invoice for a platform_sourced pairing and persist the row.
 * coach_invited is rejected by create_acquisition_invoice_row RPC.
 */
export const issueAcquisitionInvoice = async (input: {
  relationshipId: string
  amountCents?: number
}): Promise<
  | { success: true; invoiceId: string; hostedUrl: string | null }
  | { success: false; error: string }
> => {
  const amount = input.amountCents ?? ACQUISITION_FEE_CENTS
  const supabase = createSupabaseServiceClient()

  const { data: rel, error: relError } = await supabase
    .from("coach_client_relationships")
    .select("id, coach_id, client_id, acquisition_source")
    .eq("id", input.relationshipId)
    .maybeSingle()

  if (relError || !rel) return { success: false, error: "not_found" }
  if (rel.acquisition_source !== "platform_sourced") {
    return { success: false, error: "not_platform_sourced" }
  }

  const { data: coachProfile } = await supabase
    .from("coach_profiles")
    .select("stripe_customer_id")
    .eq("user_id", rel.coach_id)
    .maybeSingle()

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", rel.coach_id)
    .maybeSingle()

  const stripe = getStripe()
  let customerId = coachProfile?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email || undefined,
      name: profile?.display_name || undefined,
      metadata: { omnifit_coach_id: rel.coach_id },
    })
    customerId = customer.id
    await supabase
      .from("coach_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", rel.coach_id)
  }

  await stripe.invoiceItems.create({
    customer: customerId,
    amount,
    currency: "usd",
    description: "OmniFit client acquisition fee",
  })

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 7,
    metadata: {
      omnifit_relationship_id: rel.id,
      omnifit_coach_id: rel.coach_id,
      omnifit_client_id: rel.client_id,
      kind: "acquisition",
    },
  })

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  const hostedUrl = finalized.hosted_invoice_url ?? null

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_acquisition_invoice_row",
    {
      p_relationship_id: rel.id,
      p_amount_cents: amount,
      p_stripe_invoice_id: finalized.id,
      p_hosted_url: hostedUrl,
    }
  )

  if (rpcError) return { success: false, error: "persist_failed" }
  const payload = rpcData as { success?: boolean; error?: string; invoice_id?: string }
  if (!payload?.success) {
    return { success: false, error: payload?.error ?? "persist_failed" }
  }

  await sendAcquisitionInvoiceEmail({
    coachId: rel.coach_id,
    invoiceId: payload.invoice_id ?? finalized.id,
    amountCents: amount,
    hostedUrl,
  })

  return {
    success: true,
    invoiceId: payload.invoice_id ?? finalized.id,
    hostedUrl,
  }
}
