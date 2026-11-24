const SEND_MESSAGE_ERRORS = new Set([
  "not_authenticated",
  "missing_relationship",
  "empty_body",
  "body_too_long",
  "relationship_not_found",
  "relationship_not_active",
  "forbidden",
  "no_active_relationship",
  "send_failed",
])

const MARK_READ_ERRORS = new Set([
  "not_authenticated",
  "missing_conversation",
  "not_found",
  "forbidden",
  "no_active_relationship",
])

const LIST_ERRORS = new Set([
  "not_authenticated",
  "missing_conversation",
  "not_found",
  "forbidden",
  "no_active_relationship",
])

export const toMessagingErrorCode = (
  raw: string | undefined,
  fallback: string,
  known: Set<string>
): string => {
  if (!raw) return fallback
  const trimmed = raw.trim()
  return known.has(trimmed) ? trimmed : fallback
}

export const toSendMessageErrorCode = (raw: string | undefined) =>
  toMessagingErrorCode(raw, "send_failed", SEND_MESSAGE_ERRORS)

export const toMarkReadErrorCode = (raw: string | undefined) =>
  toMessagingErrorCode(raw, "mark_read_failed", MARK_READ_ERRORS)

export const toListMessagesErrorCode = (raw: string | undefined) =>
  toMessagingErrorCode(raw, "load_failed", LIST_ERRORS)
