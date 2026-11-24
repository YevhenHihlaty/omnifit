import type { CalendarDayGroup, CalendarSession, CalendarWeekSnapshot } from "./types"

const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const getWeekStartMonday = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = start.getDay()
  const diff = weekday === 0 ? 6 : weekday - 1
  start.setDate(start.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  return start
}

export const buildCalendarWeekSnapshot = (
  sessions: CalendarSession[],
  locale: string,
  referenceDate = new Date()
): CalendarWeekSnapshot => {
  const weekStart = getWeekStartMonday(referenceDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekLabel =
    new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
      weekStart
    ) +
    " – " +
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(weekEnd)

  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  const days: CalendarDayGroup[] = Array.from({ length: 7 }, (_, index) => {
    const dayDate = new Date(weekStart)
    dayDate.setDate(weekStart.getDate() + index)
    const key = dateKey(dayDate)
    const daySessions = sessions
      .filter((session) => dateKey(new Date(session.startsAt)) === key)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
    return {
      dateKey: key,
      dayLabel: dayFormatter.format(dayDate),
      sessions: daySessions,
    }
  })

  return { weekLabel, days }
}

export const resolveSessionPaymentStatus = (params: {
  freeFirstSession: boolean
  paymentCollection: "in_app" | "direct"
  priorSessionCount: number
}): string => {
  if (params.freeFirstSession && params.priorSessionCount === 0) {
    return "not_required"
  }
  if (params.paymentCollection === "in_app") return "awaiting_payment"
  return "direct"
}
