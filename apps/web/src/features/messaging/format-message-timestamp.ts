/** Inbox list age — design: 2m / 28m / 1h / Yesterday / Mon */
export const formatInboxAge = (iso: string, locale: string, now = new Date()): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  const diffMs = now.getTime() - date.getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60_000))
  if (mins < 60) return `${Math.max(1, mins)}m`

  const hours = Math.floor(mins / 60)
  if (hours < 24 && isSameCalendarDay(date, now)) return `${hours}h`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) {
    return locale.startsWith("pl")
      ? "Wczoraj"
      : locale.startsWith("uk")
        ? "Вчора"
        : "Yesterday"
  }

  if (diffMs < 7 * 24 * 60 * 60_000) {
    return date.toLocaleDateString(locale, { weekday: "short" })
  }

  return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

/** Bubble clock time — design: 9:12 AM under the bubble */
export const formatBubbleTime = (iso: string, locale: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  })
}

/** Day separator label — Today / Yesterday / full date */
export const formatDayLabel = (iso: string, locale: string, now = new Date()): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  if (isSameCalendarDay(date, now)) {
    return locale.startsWith("pl")
      ? "Dziś"
      : locale.startsWith("uk")
        ? "Сьогодні"
        : "Today"
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) {
    return locale.startsWith("pl")
      ? "Wczoraj"
      : locale.startsWith("uk")
        ? "Вчора"
        : "Yesterday"
  }

  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export const dayKey = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "invalid"
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** @deprecated use formatInboxAge / formatBubbleTime */
export const formatMessageTimestamp = (iso: string, locale: string): string =>
  formatInboxAge(iso, locale)
