import type { UserRole } from "@omnifit/shared"

/** Thrown when a non-coach user attempts a coach-only action. */
export class ForbiddenError extends Error {
  readonly status = 403 as const
  constructor(message = "Forbidden: coach role required") {
    super(message)
    this.name = "ForbiddenError"
  }
}

/**
 * Asserts that the resolved role is "coach".
 * Throws ForbiddenError (HTTP 403) for any other role, including null.
 *
 * Use in server actions / route handlers before coach-only logic.
 */
export const assertCoachRole = (role: UserRole | null): void => {
  if (role !== "coach") {
    throw new ForbiddenError()
  }
}
