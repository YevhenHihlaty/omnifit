import { AUTH_ONLY_PATHS as AUTH_ONLY_PATH_LIST, ROUTES } from "@/lib/routes"

/** Canonical auth-only paths from routes.ts (login, register, etc.) */
const AUTH_ONLY_PATH_SET = new Set<string>(AUTH_ONLY_PATH_LIST)

/**
 * Auth flows that must stay reachable without bouncing authenticated users.
 * /auth/callback arrives unauthenticated (PKCE); /reset-password/update needs
 * the recovery session to stay on-page.
 */
const AUTH_FLOW_PASSTHROUGH = new Set<string>([
  ROUTES.authCallback,
  ROUTES.resetPasswordUpdate,
])

/** Set of marketing paths accessible to everyone. */
const MARKETING_PATHS = new Set<string>([
  ROUTES.home,
  ROUTES.pricing,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.offline,
])

/** Always public — must not bounce on corrupt sessions (SEO / utility). */
const ALWAYS_PUBLIC_PATHS = new Set<string>([
  "/robots.txt",
  "/sitemap.xml",
  ROUTES.offline,
])

export type SessionState = "authenticated" | "unauthenticated" | "sessionError"

export type AuthRedirectResult = {
  /** Destination to redirect to, or null to allow the request through. */
  destination: string | null
}

const isPublicClientInvitePath = (pathname: string) =>
  pathname === ROUTES.inviteClientBase ||
  pathname.startsWith(`${ROUTES.inviteClientBase}/`)

/**
 * Resolves the redirect destination for a given pathname + session state.
 *
 * Matrix:
 *   always-public paths   → null (robots/sitemap/offline)
 *   sessionError + public/auth/marketing → null (recover via login; keep SEO up)
 *   sessionError + protected → /session-expired
 *   authenticated + auth-only path → /dashboard
 *   authenticated + any other       → null (allow)
 *   unauthenticated + auth-only / marketing / auth-flow / client invite → null (allow)
 *   unauthenticated + protected     → /login
 */
export const resolveAuthRedirect = (
  pathname: string,
  session: SessionState
): AuthRedirectResult => {
  if (ALWAYS_PUBLIC_PATHS.has(pathname)) {
    return { destination: null }
  }

  const isPublicSurface =
    AUTH_ONLY_PATH_SET.has(pathname) ||
    MARKETING_PATHS.has(pathname) ||
    AUTH_FLOW_PASSTHROUGH.has(pathname) ||
    isPublicClientInvitePath(pathname)

  if (session === "sessionError") {
    if (pathname === ROUTES.sessionExpired || isPublicSurface) {
      return { destination: null }
    }
    return { destination: ROUTES.sessionExpired }
  }

  if (session === "authenticated") {
    // Allow authenticated users to reach session-expired so broken-profile
    // accounts don't loop: /dashboard → /session-expired → /dashboard → …
    if (pathname === ROUTES.sessionExpired) {
      return { destination: null }
    }
    if (AUTH_ONLY_PATH_SET.has(pathname)) {
      return { destination: ROUTES.dashboard }
    }
    return { destination: null }
  }

  // unauthenticated
  if (isPublicSurface) {
    return { destination: null }
  }
  return { destination: ROUTES.login }
}
