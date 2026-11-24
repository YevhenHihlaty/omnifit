"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { LOCALES, type Locale } from "@/lib/i18n/constants"

export type ClientSettingsActionResult =
  | { success: true }
  | { success: false; error: string }

export const updatePreferredLocale = async (
  locale: string
): Promise<ClientSettingsActionResult> => {
  if (!LOCALES.includes(locale as Locale)) {
    return { success: false, error: "invalid_locale" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { error } = await supabase
    .from("profiles")
    .update({ locale })
    .eq("id", user.id)

  if (error) return { success: false, error: "update_failed" }
  revalidatePath(ROUTES.clientSettings)
  return { success: true }
}

export const anonymizeOwnAccount = async (): Promise<
  ClientSettingsActionResult
> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase.rpc("anonymize_own_account")
  if (error) return { success: false, error: "anonymize_failed" }

  const payload = data as Record<string, unknown> | null
  if (!payload || payload.success !== true) {
    return {
      success: false,
      error: String(payload?.error ?? "anonymize_failed"),
    }
  }

  await supabase.auth.signOut()
  return { success: true }
}
