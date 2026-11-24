"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type RevokeClientInviteResult =
  | { success: true }
  | { success: false; error: string }

export const revokeClientInvite = async (
  inviteId: string
): Promise<RevokeClientInviteResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data, error } = await supabase.rpc("revoke_client_invite", {
    p_invite_id: inviteId,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as { success?: boolean; error?: string } | null
  if (!result?.success) {
    return { success: false, error: result?.error ?? "revoke_failed" }
  }

  revalidatePath(ROUTES.dashboard)
  revalidatePath(ROUTES.clients)

  return { success: true }
}
