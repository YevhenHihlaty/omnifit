"use server"

import { redirect } from "next/navigation"
import { coachSignupSchema, signInSchema, resetRequestSchema, updatePasswordSchema } from "@omnifit/shared"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { sanitizeAuthRedirectPath } from "@/lib/auth/sanitize-auth-redirect-path"
import { ROUTES } from "@/lib/routes"
import { assertCoachOnlySignupRole } from "./coach-role-guard"

export type ActionResult =
  | { ok: true; email?: string }
  | { error: string; status?: number }
  | null

export { assertCoachOnlySignupRole }

export const signUpCoach = async (formData: FormData): Promise<ActionResult> => {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    displayName: formData.get("displayName"),
    phone: formData.get("phone") ?? "",
    role: formData.get("role"),
    terms: formData.get("terms"),
  }

  const roleCheck = assertCoachOnlySignupRole(raw.role)
  if (!roleCheck.ok) return { error: "forbidden", status: 403 }

  if (raw.terms !== "on" && raw.terms !== "true") {
    return { error: "auth.termsRequired" }
  }

  const parsed = coachSignupSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { email, password, displayName, phone } = parsed.data
  const supabase = await createSupabaseServerClient()

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${ROUTES.authCallback}`,
    },
  })

  if (signUpError) return { error: "auth.signupError" }

  const userId = data.user?.id
  if (!userId) return { error: "auth.signupError" }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "coach",
      display_name: displayName,
      phone_e164: phone,
    })
    .eq("id", userId)

  if (profileError) {
    // Unique phone / other constraint → generic (no enumeration)
    return { error: "auth.signupError" }
  }

  redirect(`${ROUTES.verifyEmail}?email=${encodeURIComponent(email)}`)
}

export const signIn = async (
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> => {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "auth.invalidCredentials" }

  const nextRaw = formData.get("next") as string | null
  if (nextRaw) {
    redirect(sanitizeAuthRedirectPath(nextRaw))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role === "client") {
      redirect(ROUTES.clientHome)
    }
  }

  redirect(ROUTES.dashboard)
}

export const requestPasswordReset = async (
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> => {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) return { error: "auth.invalidEmail" }

  const supabase = await createSupabaseServerClient()
  // Always succeed toward UI — no account enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${ROUTES.resetPasswordUpdate}`,
  })

  return { ok: true, email: parsed.data.email }
}

export const resendVerificationEmail = async (email: string): Promise<ActionResult> => {
  const parsed = resetRequestSchema.safeParse({ email })
  if (!parsed.success) return { error: "auth.invalidEmail" }

  const supabase = await createSupabaseServerClient()
  // Generic success — no enumeration of whether the address exists
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${ROUTES.authCallback}`,
    },
  })
  return { ok: true, email: parsed.data.email }
}

export const updatePassword = async (
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> => {
  const parsed = updatePasswordSchema.safeParse({ password: formData.get("password") })
  if (!parsed.success) return { error: "auth.updatePasswordError" }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: "auth.updatePasswordError" }

  await supabase.auth.signOut()
  redirect(`${ROUTES.login}?reset=success`)
}

export const signOut = async (): Promise<void> => {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect(ROUTES.login)
}
