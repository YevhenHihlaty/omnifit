/** Build ISO start from local date + HH:mm in a given IANA timezone (best-effort). */
export const buildBookingStartsAt = (
  dateIso: string,
  timeHm: string,
  timeZone: string
): string | null => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim())
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeHm.trim())
  if (!dateMatch || !timeMatch) return null

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  // ponytail: interpret wall time in timezone via Intl offset probe; ceiling = odd DST folds
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(probe)

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? ""
  const tzName = get("timeZoneName") // GMT+2 / UTC+2 / GMT-5
  const match = /([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tzName)
  let offsetMin = 0
  if (match) {
    const sign = match[1] === "-" ? -1 : 1
    offsetMin =
      sign *
      (Number(match[2]) * 60 + Number(match[3] ?? "0"))
  }

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMin * 60_000
  return new Date(utcMs).toISOString()
}

export const BOOKING_DURATION_OPTIONS = [30, 45, 60, 90] as const
