export type NoteKind = "manual" | "post_training"

export type CoachNote = {
  id: string
  title: string
  body: string
  bodyPreview: string
  kind: NoteKind
  clientId: string | null
  clientName: string | null
  createdAt: string
}

export type NoteClientOption = {
  id: string
  displayName: string
}

export type NoteRow = {
  id: string
  title: string
  body: string
  kind: string
  client_id: string | null
  created_at: string
  client?: { display_name: string | null } | { display_name: string | null }[] | null
}

const asProfile = (
  value: NoteRow["client"]
): { display_name: string | null } | null => {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === "object" ? first : null
  }
  return value
}

const truncate = (body: string, max = 120) => {
  const trimmed = body.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export const mapNoteRow = (row: NoteRow): CoachNote => {
  const client = asProfile(row.client)
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    bodyPreview: truncate(row.body),
    kind: row.kind === "post_training" ? "post_training" : "manual",
    clientId: row.client_id,
    clientName: client?.display_name?.trim() || null,
    createdAt: row.created_at,
  }
}

export const formatNoteCreated = (iso: string, locale: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
