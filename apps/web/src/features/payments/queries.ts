import { createSupabaseServerClient } from "@/lib/supabase/server"

export type AcquisitionInvoiceRow = {
  id: string
  amountCents: number
  currency: string
  status: string
  hostedUrl: string | null
  paidAt: string | null
  createdAt: string
  clientName: string
}

export const listCoachAcquisitionInvoices = async (): Promise<{
  invoices: AcquisitionInvoiceRow[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { invoices: [], loadFailed: true }

  const { data, error } = await supabase
    .from("acquisition_invoices")
    .select(
      `
      id,
      amount_cents,
      currency,
      status,
      stripe_hosted_invoice_url,
      paid_at,
      created_at,
      client:profiles!acquisition_invoices_client_id_fkey(display_name, email)
    `
    )
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return { invoices: [], loadFailed: true }

  return {
    invoices: (data ?? []).map((row) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client
      const profile = client as
        | { display_name?: string | null; email?: string | null }
        | null
        | undefined
      const name =
        profile?.display_name?.trim() ||
        profile?.email?.split("@")[0] ||
        "Client"
      return {
        id: row.id as string,
        amountCents: Number(row.amount_cents ?? 0),
        currency: String(row.currency ?? "usd"),
        status: String(row.status ?? "draft"),
        hostedUrl: (row.stripe_hosted_invoice_url as string | null) ?? null,
        paidAt: (row.paid_at as string | null) ?? null,
        createdAt: row.created_at as string,
        clientName: name,
      }
    }),
    loadFailed: false,
  }
}

export const coachHasUnpaidAcquisition = async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.rpc("coach_has_unpaid_acquisition", {
    p_coach_id: user.id,
  })
  return data === true
}
