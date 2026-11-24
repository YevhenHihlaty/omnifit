"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { randomBytes } from "crypto"
import { hashInviteToken } from "@/features/client-invite/hash-invite-token"
import { sendClientInviteEmails } from "@/features/client-invite/send-client-invite-emails"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const INVITE_TTL_DAYS = 7

export type ResendClientInviteResult =
  | { success: true; email: string }
  | { success: false; error: string }

export const resendClientInvite = async (
  inviteId: string
): Promise<ResendClientInviteResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS)

  const { data, error } = await supabase.rpc("resend_client_invite", {
    p_invite_id: inviteId,
    p_token_hash: hashInviteToken(token),
    p_expires_at: expiresAt.toISOString(),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as {
    success?: boolean
    error?: string
    email?: string
  } | null

  if (!result?.success) {
    return { success: false, error: result?.error ?? "resend_failed" }
  }

  const email = result.email ?? ""

  const { data: coachDisplay } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle()

  const coachName =
    coachDisplay?.display_name?.trim() ||
    coachDisplay?.email?.split("@")[0] ||
    "Your coach"

  if (email) {
    await sendClientInviteEmails([{ email, token }], coachName)
  }

  revalidatePath(ROUTES.dashboard)
  revalidatePath(ROUTES.clients)

  return { success: true, email }
}
