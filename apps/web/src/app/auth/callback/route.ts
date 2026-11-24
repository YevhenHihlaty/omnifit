import { sanitizeAuthRedirectPath } from "@/lib/auth/sanitize-auth-redirect-path"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { NextResponse } from "next/server"

const CALLBACK_ERROR_REDIRECT = `${ROUTES.login}?error=callback_failed`

export const GET = async (request: Request) => {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const oauthError = searchParams.get("error")
  const next = sanitizeAuthRedirectPath(searchParams.get("next"), ROUTES.onboardingProfile)

  if (oauthError) {
    return NextResponse.redirect(`${origin}${CALLBACK_ERROR_REDIRECT}`)
  }

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}${CALLBACK_ERROR_REDIRECT}`)
}
