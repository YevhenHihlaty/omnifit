/**
 * Calendar date YYYY-MM-DD in a given IANA timezone.
 * Use the same helper for habit load + toggle so "today" never desyncs.
 */
export const toCalendarDateIso = (
  date: Date = new Date(),
  timeZone = "UTC"
): string => {
  try {
    return date.toLocaleDateString("en-CA", { timeZone })
  } catch {
    // Invalid TZ → UTC
    return date.toLocaleDateString("en-CA", { timeZone: "UTC" })
  }
}

/** Browser IANA zone when available (client components / actions from the browser). */
export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}
