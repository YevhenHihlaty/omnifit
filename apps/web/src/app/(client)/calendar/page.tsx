import type { Metadata } from "next"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { SPORT_TYPES } from "@/features/log-training/types"
import { ClientCalendarView } from "@/features/coaching-booking/ClientCalendarView"
import { buildClientBookingLabels } from "@/features/coaching-booking/labels"
import {
  getClientHasPhone,
  listClientActiveCoaches,
  listClientBookingRequests,
  loadClientCalendarSessions,
} from "@/features/coaching-booking/queries"
import { getWeekStartMonday } from "@/features/app-calendar/week"
import { stripeSessionCheckoutEnabled } from "@/lib/feature-flags"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("booking.client.title") }
}

export default async function ClientCalendarPage() {
  const { t, locale } = await getServerTranslator()

  const weekStart = getWeekStartMonday(new Date())
  const rangeStart = new Date(weekStart)
  rangeStart.setDate(rangeStart.getDate() - 14)
  const rangeEnd = new Date(weekStart)
  rangeEnd.setDate(rangeEnd.getDate() + 27)
  rangeEnd.setHours(23, 59, 59, 999)

  const [coaches, requests, calendar, hasPhone] = await Promise.all([
    listClientActiveCoaches(),
    listClientBookingRequests(),
    loadClientCalendarSessions(
      rangeStart.toISOString(),
      rangeEnd.toISOString()
    ),
    getClientHasPhone(),
  ])

  const sportLabels = Object.fromEntries(
    SPORT_TYPES.map((s) => [s, t(`logTraining.sports.${s}`)])
  )

  return (
    <ClientCalendarView
      locale={locale}
      coaches={coaches.coaches}
      requests={requests.requests}
      sessions={calendar.sessions}
      hasPhone={hasPhone}
      loadFailed={
        coaches.loadFailed || requests.loadFailed || calendar.loadFailed
      }
      rangeStartIso={rangeStart.toISOString()}
      rangeEndIso={rangeEnd.toISOString()}
      labels={buildClientBookingLabels(
        t,
        sportLabels,
        stripeSessionCheckoutEnabled()
      )}
    />
  )
}
