import { toCalendarDateIso } from "@/features/client-home/calendar-date"

/**
 * Sunday-start week date (YYYY-MM-DD) in the given IANA timezone.
 * Matches migration 093 "Sunday subjective" check-ins.
 */
export const weekStartSundayIso = (
  date: Date = new Date(),
  timeZone = "UTC"
): string => {
  const calendar = toCalendarDateIso(date, timeZone)
  const [year, month, day] = calendar.split("-").map(Number)
  // Noon UTC avoids DST edge cases when shifting by weekday
  const utcNoon = new Date(Date.UTC(year!, month! - 1, day!, 12))
  const weekday = utcNoon.getUTCDay() // 0 = Sunday
  utcNoon.setUTCDate(utcNoon.getUTCDate() - weekday)
  return utcNoon.toISOString().slice(0, 10)
}
