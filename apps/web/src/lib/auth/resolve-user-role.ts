import type { UserRole } from "@omnifit/shared"

const VALID_ROLES = new Set<string>(["coach", "client"])

/**
 * Resolves the authoritative user role from the database profile only.
 * user_metadata is intentionally ignored — it is client-writable and must never
 * be trusted for authorization decisions.
 *
 * @returns UserRole if profile contains a valid role, null otherwise
 */
export const resolveUserRole = (
  profile: { role?: string | null } | null | undefined
): UserRole | null => {
  const role = profile?.role
  if (typeof role === "string" && VALID_ROLES.has(role)) {
    return role as UserRole
  }
  return null
}
