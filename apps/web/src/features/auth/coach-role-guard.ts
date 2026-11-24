/** Testable guard: only 'coach' role (or absent) is allowed at signup. */
export const assertCoachOnlySignupRole = (
  role: unknown
): { ok: true } | { ok: false; status: 403 } => {
  if (role === undefined || role === null || role === "") return { ok: true }
  if (role !== "coach") return { ok: false, status: 403 as const }
  return { ok: true }
}
