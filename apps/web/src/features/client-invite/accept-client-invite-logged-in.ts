"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { parseAcceptClientInviteResult } from "@/features/client-invite/client-invite-preview"
import { getClientInvitePreview } from "@/features/client-invite/get-client-invite-preview"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type AcceptClientInviteLoggedInInput = {
  token: string
  disclosureConfirmed?: boolean
}

export type AcceptClientInviteLoggedInResult =
  | { success: true }
  | { success: false; error: string }

export const acceptClientInviteLoggedIn = async (
  input: AcceptClientInviteLoggedInInput
): Promise<AcceptClientInviteLoggedInResult> => {
  const token = input.token.trim()
  if (!token) {
    return { success: false, error: "missing_token" }
  }

  const preview = await getClientInvitePreview(token)
  if (preview.valid !== true) {
    return { success: false, error: preview.error }
  }

  if (preview.sharedLogDisclosure && !input.disclosureConfirmed) {
    return { success: false, error: "disclosure_required" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data, error } = await supabase.rpc("accept_client_invite", {
    p_token: token,
    p_disclosure_confirmed: Boolean(input.disclosureConfirmed),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = parseAcceptClientInviteResult(data)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  revalidatePath("/", "layout")
  redirect(ROUTES.clientHome)
}
