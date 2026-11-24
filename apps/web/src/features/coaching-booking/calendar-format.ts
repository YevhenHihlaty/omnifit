/** Shared booking/calendar display helpers (Sprint 9 audit). */

export const localDateKey = (isoOrDate: string | Date) => {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const formatSessionTimeRange = (
  startsAt: string,
  endsAt: string,
  locale: string
) => {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const fmt = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

export const formatSessionDayHeading = (dateKey: string, locale: string) => {
  const [y, m, d] = dateKey.split("-").map(Number)
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1)
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

export const resolveSessionTitle = (
  title: string,
  sportType: string | null,
  sportLabels: Record<string, string>
) => {
  if (sportType && sportLabels[sportType]) return sportLabels[sportType]
  // Strip raw "weight_lifting session" style titles from RPC
  const stripped = title.replace(/\s+session$/i, "").trim()
  if (stripped && sportLabels[stripped]) return sportLabels[stripped]
  return title
}

export type PaymentPillVariant =
  | "active"
  | "pending"
  | "inactive"
  | "warning"
  | "danger"

export const paymentPillVariant = (
  status: string | null
): PaymentPillVariant => {
  if (status === "not_required" || status === "paid" || status === "paid_offline") {
    return "active"
  }
  if (status === "awaiting_payment" || status === "overdue") return "danger"
  if (status === "pending") return "pending"
  if (status === "direct") return "inactive"
  return "inactive"
}
