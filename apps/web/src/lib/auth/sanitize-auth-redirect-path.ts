const SAFE_FALLBACK = "/dashboard"

// Matches any URI scheme followed by ://  (http://, https://, javascript://, etc.)
const SCHEME_RE = /[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//

/**
 * Validates a next-redirect path to prevent open-redirect attacks.
 *
 * Rejects:
 *   - protocol-relative URLs  (//)
 *   - absolute URLs with a scheme  (://  prefix)
 *   - backslash sequences  (IE / Windows open-redirect vector)
 *   - paths that do not start with /
 *
 * @returns the original path if safe, or `fallback` (default: /dashboard)
 */
export const sanitizeAuthRedirectPath = (
  path: string | null | undefined,
  fallback = SAFE_FALLBACK
): string => {
  if (!path || typeof path !== "string") return fallback
  if (path.startsWith("//")) return fallback
  if (SCHEME_RE.test(path)) return fallback
  if (path.includes("\\")) return fallback
  if (!path.startsWith("/")) return fallback
  return path
}
