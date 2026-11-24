/** Maps RPC / action error codes to clientInvite.* message keys. */
export const mapInviteErrorToMessageKey = (code: string): string => {
  const normalized = code.trim().toLowerCase()

  switch (normalized) {
    case "roster_limit_reached":
      return "clientInvite.errors.rosterLimit"
    case "invite_already_pending":
      return "clientInvite.errors.pending"
    case "email_is_coach":
      return "clientInvite.errors.emailIsCoach"
    case "client_already_on_roster":
      return "clientInvite.errors.onRoster"
    case "not_authenticated":
      return "clientInvite.errors.notAuthenticated"
    case "forbidden":
      return "clientInvite.errors.forbidden"
    case "not_found":
    case "missing_token":
      return "clientInvite.errors.notFound"
    case "invalid_status":
      return "clientInvite.errors.invalidStatus"
    case "disclosure_required":
      return "clientInvite.errors.disclosureRequired"
    case "client_role_required":
      return "clientInvite.errors.clientRoleRequired"
    case "email_mismatch":
      return "clientInvite.errors.emailMismatch"
    case "user_mismatch":
      return "clientInvite.errors.userMismatch"
    case "expired":
      return "clientInvite.errors.expired"
    case "revoked":
      return "clientInvite.errors.revoked"
    case "passwords do not match":
      return "clientInvite.errors.passwordMismatch"
    case "invite link is invalid":
    case "invalid_input":
      return "clientInvite.errors.invalidInvite"
    default:
      if (normalized.includes("password")) {
        return "clientInvite.errors.passwordWeak"
      }
      if (
        normalized.includes("already registered") ||
        normalized.includes("already been registered") ||
        normalized.includes("user already exists") ||
        normalized.includes("invalid login") ||
        normalized.includes("invalid credentials")
      ) {
        return "clientInvite.errors.authFailed"
      }
      return "clientInvite.errors.generic"
  }
}

export const resolveInviteErrorMessage = (
  code: string,
  t: (key: string) => string
): string => t(mapInviteErrorToMessageKey(code))
