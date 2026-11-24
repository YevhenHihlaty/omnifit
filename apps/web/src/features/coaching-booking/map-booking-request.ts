import type { BookingRequestRow, BookingRequestSummary } from "./types"

const displayName = (
  profile: { display_name: string | null; email?: string | null } | null | undefined,
  fallback: string
) => {
  const name = profile?.display_name?.trim()
  if (name) return name
  const email = profile?.email?.trim()
  if (email?.includes("@")) return email.split("@")[0]!
  return fallback
}

export const mapBookingRequestRow = (
  row: BookingRequestRow,
  role: "coach" | "client"
): BookingRequestSummary => ({
  requestId: row.id,
  coachId: row.coach_id,
  clientId: row.client_id,
  sportType: row.sport_type,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  durationMinutes: row.duration_minutes,
  status: row.status as BookingRequestSummary["status"],
  clientNote: row.client_note,
  declineReason: row.decline_reason,
  sessionId: row.session_id,
  counterpartName:
    role === "coach"
      ? displayName(row.client ?? null, "Client")
      : displayName(row.coach ?? null, "Coach"),
  createdAt: row.created_at,
})

export const formatBookingSlot = (
  startsAt: string,
  durationMinutes: number,
  locale: string,
  endsAt?: string
) => {
  const start = new Date(startsAt)
  const end = endsAt
    ? new Date(endsAt)
    : new Date(start.getTime() + durationMinutes * 60_000)
  const date = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start)
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${date} · ${timeFmt.format(start)}–${timeFmt.format(end)}`
}

export const formatBookingError = (code: string, labels: Record<string, string>) => {
  const normalized =
    code === "reason_required" ? "decline_reason_required" : code
  return labels[normalized] ?? labels.generic ?? code
}

export const formatRelativeRequestedAt = (
  createdAt: string,
  locale: string,
  labels: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string }
) => {
  const created = new Date(createdAt).getTime()
  const diffMs = Date.now() - created
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return labels.justNow
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return labels.minutesAgo.replace("{n}", String(mins))
  const hours = Math.floor(mins / 60)
  if (hours < 48) return labels.hoursAgo.replace("{n}", String(hours))
  const days = Math.floor(hours / 24)
  return labels.daysAgo.replace("{n}", String(days))
}
