"use server"

import { completeClientInviteSchema } from "@omnifit/shared"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { parseAcceptClientInviteResult } from "@/features/client-invite/client-invite-preview"
import { getClientInvitePreview } from "@/features/client-invite/get-client-invite-preview"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type CompleteClientInviteResult =
  | { success: true }
  | { success: false; error: string }

const isExistingUserError = (message: string) => {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already exists")
  )
}

const ensureInviteSession = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  email: string,
  password: string
): Promise<CompleteClientInviteResult | null> => {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (!signInError) return null

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (signUpError && !isExistingUserError(signUpError.message)) {
    return { success: false, error: signUpError.message }
  }

  const { error: postSignUpSignInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (postSignUpSignInError) {
    return { success: false, error: postSignUpSignInError.message }
  }

  return null
}

export const completeClientInvite = async (
  input: unknown
): Promise<CompleteClientInviteResult> => {
  const parsed = completeClientInviteSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "invalid_input",
    }
  }

  const token = parsed.data.token.trim()
  const preview = await getClientInvitePreview(token)

  if (preview.valid !== true) {
    return { success: false, error: preview.error }
  }

  if (preview.sharedLogDisclosure && !parsed.data.disclosureConfirmed) {
    return { success: false, error: "disclosure_required" }
  }

  const supabase = await createSupabaseServerClient()

  const sessionError = await ensureInviteSession(
    supabase,
    preview.inviteEmail,
    parsed.data.password
  )

  if (sessionError) {
    return sessionError
  }

  const { data, error } = await supabase.rpc("accept_client_invite", {
    p_token: token,
    p_disclosure_confirmed: Boolean(parsed.data.disclosureConfirmed),
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
