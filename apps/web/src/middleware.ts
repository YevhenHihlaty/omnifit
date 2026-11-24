import { type NextRequest, NextResponse } from "next/server"
import { updateSupabaseSession } from "@/lib/supabase/middleware"
import { resolveAuthRedirect, type SessionState } from "@/lib/auth/resolve-auth-redirect"

export const middleware = async (request: NextRequest) => {
  const { response, user, error } = await updateSupabaseSession(request)
  const pathname = request.nextUrl.pathname

  const session: SessionState = error
    ? "sessionError"
    : user
      ? "authenticated"
      : "unauthenticated"

  const { destination } = resolveAuthRedirect(pathname, session)

  if (destination) {
    const url = request.nextUrl.clone()
    url.pathname = destination.split("?")[0]
    url.search = destination.includes("?") ? destination.split("?")[1] : ""
    const redirectResponse = NextResponse.redirect(url)

    // Copy Supabase auth cookies to the redirect response
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    }

    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
