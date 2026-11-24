export type ClientInvitePreviewError =
  | "missing_token"
  | "not_found"
  | "revoked"
  | "already_accepted"
  | "expired"

export type ClientInviteAcceptMode = "new_user" | "existing_client"

export type OtherCoachSummary = {
  coachId: string
  displayName: string
}

export type ClientInvitePreview =
  | {
      valid: true
      inviteId: string
      coachId: string
      coachName: string
      inviteEmail: string
      status: string
      expiresAt: string
      acceptMode: ClientInviteAcceptMode
      sharedLogDisclosure: boolean
      activeCoachCount: number
      otherCoaches: OtherCoachSummary[]
    }
  | {
      valid: false
      error: ClientInvitePreviewError
      status?: string
      coachName?: string
    }

export type AcceptClientInviteResult =
  | {
      success: true
      relationshipId?: string
      alreadyAccepted?: boolean
    }
  | {
      success: false
      error: string
    }

const previewError = (value: unknown): ClientInvitePreviewError => {
  if (value === "missing_token") return "missing_token"
  if (value === "revoked") return "revoked"
  if (value === "already_accepted") return "already_accepted"
  if (value === "expired") return "expired"
  return "not_found"
}

const parseOtherCoaches = (raw: unknown): OtherCoachSummary[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const coachId = String(row.coach_id ?? "")
      if (!coachId) return null
      return {
        coachId,
        displayName: String(row.display_name ?? "Coach"),
      }
    })
    .filter((item): item is OtherCoachSummary => item !== null)
}

export const parseClientInvitePreview = (raw: unknown): ClientInvitePreview => {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "not_found" }
  }

  const data = raw as Record<string, unknown>

  if (data.valid !== true) {
    return {
      valid: false,
      error: previewError(data.error),
      status: typeof data.status === "string" ? data.status : undefined,
      coachName:
        typeof data.coach_name === "string" ? data.coach_name : undefined,
    }
  }

  const acceptModeRaw = data.accept_mode
  const acceptMode: ClientInviteAcceptMode =
    acceptModeRaw === "existing_client" ? "existing_client" : "new_user"

  return {
    valid: true,
    inviteId: String(data.invite_id ?? ""),
    coachId: String(data.coach_id ?? ""),
    coachName: String(data.coach_name ?? "Your coach"),
    inviteEmail: String(data.invite_email ?? ""),
    status: String(data.status ?? "pending"),
    expiresAt: String(data.expires_at ?? ""),
    acceptMode,
    sharedLogDisclosure: data.shared_log_disclosure === true,
    activeCoachCount:
      typeof data.active_coach_count === "number"
        ? data.active_coach_count
        : Number(data.active_coach_count ?? 0),
    otherCoaches: parseOtherCoaches(data.other_coaches),
  }
}

export const parseAcceptClientInviteResult = (
  raw: unknown
): AcceptClientInviteResult => {
  if (!raw || typeof raw !== "object") {
    return { success: false, error: "Unexpected response" }
  }

  const data = raw as Record<string, unknown>

  if (data.success === true) {
    return {
      success: true,
      relationshipId:
        typeof data.relationship_id === "string"
          ? data.relationship_id
          : undefined,
      alreadyAccepted: data.already_accepted === true,
    }
  }

  return {
    success: false,
    error: String(data.error ?? "accept_failed"),
  }
}
