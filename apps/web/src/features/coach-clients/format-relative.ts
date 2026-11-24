/**
 * Relative / friendly date formatting for roster, preview, and dashboard strip.
 * Pure — no I/O.
 */

const DAY_MS = 86_400_000

export const daysBetween = (fromIso: string, toIso: string): number => {
  const a = Date.parse(fromIso.slice(0, 10))
  const b = Date.parse(toIso.slice(0, 10))
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((b - a) / DAY_MS)
}

/**
 * Format a check-in / log date relative to today.
 * Examples: "Today", "Yesterday", "2 days ago", "Just joined" (via caller), or locale date.
 */
export const formatRelativeDay = (
  iso: string | null | undefined,
  todayIso: string,
  labels: {
    today: string
    yesterday: string
    daysAgo: (n: number) => string
  }
): string => {
  if (!iso) return "—"
  const days = daysBetween(iso, todayIso)
  if (days <= 0) return labels.today
  if (days === 1) return labels.yesterday
  if (days < 14) return labels.daysAgo(days)
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso.slice(0, 10)
  }
}

/** Activity timestamp: time-of-day if today, else relative day. */
export const formatActivityAt = (
  iso: string,
  now: Date = new Date(),
  locale?: string
): string => {
  try {
    const d = new Date(iso)
    const today = now.toISOString().slice(0, 10)
    const day = d.toISOString().slice(0, 10)
    if (day === today) {
      return d.toLocaleTimeString(locale ?? undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    }
    const yest = new Date(now)
    yest.setDate(yest.getDate() - 1)
    if (day === yest.toISOString().slice(0, 10)) {
      return d.toLocaleDateString(locale ?? undefined, { month: "short", day: "numeric" })
    }
    return d.toLocaleDateString(locale ?? undefined, { month: "short", day: "numeric" })
  } catch {
    return iso
  }
}
