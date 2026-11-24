"use server"

import { inviteClientByEmailSchema } from "@omnifit/shared"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { randomBytes } from "crypto"
import { sendClientInviteEmails } from "@/features/client-invite/send-client-invite-emails"
import { hashInviteToken } from "@/features/client-invite/hash-invite-token"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const INVITE_TTL_DAYS = 7

export type InviteClientByEmailResult =
  | { success: true; email: string }
  | { success: false; error: string }

type CreateClientInviteResult = {
  success?: boolean
  error?: string
  email?: string
}

export const inviteClientByEmail = async (
  input: unknown
): Promise<InviteClientByEmailResult> => {
  const parsed = inviteClientByEmailSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "invalid_input",
    }
  }

  const email = parsed.data.email.trim().toLowerCase()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user: coachUser },
  } = await supabase.auth.getUser()

  if (!coachUser) redirect(ROUTES.login)

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS)

  const { data, error } = await supabase.rpc("create_client_invite", {
    p_email: email,
    p_token_hash: hashInviteToken(token),
    p_expires_at: expiresAt.toISOString(),
    p_origin_session_id: parsed.data.originSessionId ?? null,
    p_origin_series_id: parsed.data.originSeriesId ?? null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as CreateClientInviteResult | null

  if (!result?.success) {
    return { success: false, error: result?.error ?? "invite_failed" }
  }

  const { data: coachDisplay } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", coachUser.id)
    .maybeSingle()

  const coachName =
    coachDisplay?.display_name?.trim() ||
    coachDisplay?.email?.split("@")[0] ||
    "Your coach"

  await sendClientInviteEmails([{ email, token }], coachName)

  revalidatePath(ROUTES.dashboard)
  revalidatePath(ROUTES.clients)

  return { success: true, email: result.email ?? email }
}
