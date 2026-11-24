import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { SPORT_TYPES } from "@/features/log-training/types"
import { CoachSessionsView } from "@/features/coaching-booking/CoachSessionsView"
import { buildCoachBookingLabels } from "@/features/coaching-booking/labels"
import {
  getCoachBookingSettings,
  listCoachPendingBookingRequests,
  loadCoachCalendarSessions,
} from "@/features/coaching-booking/queries"
import { getWeekStartMonday } from "@/features/app-calendar/week"
import {
  coachHasUnpaidAcquisition,
  listCoachAcquisitionInvoices,
} from "@/features/payments/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("booking.coach.title") }
}

export default async function CoachSessionsPage() {
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const weekStart = getWeekStartMonday(new Date())
  const rangeStart = new Date(weekStart)
  rangeStart.setDate(rangeStart.getDate() - 14)
  const rangeEnd = new Date(weekStart)
  rangeEnd.setDate(rangeEnd.getDate() + 27)
  rangeEnd.setHours(23, 59, 59, 999)

  const [pending, calendar, settings, unpaid, invoices] = await Promise.all([
    listCoachPendingBookingRequests(),
    loadCoachCalendarSessions(
      rangeStart.toISOString(),
      rangeEnd.toISOString()
    ),
    getCoachBookingSettings(),
    coachHasUnpaidAcquisition(),
    listCoachAcquisitionInvoices(),
  ])

  const sportLabels = Object.fromEntries(
    SPORT_TYPES.map((s) => [s, t(`logTraining.sports.${s}`)])
  )

  const openInvoice = invoices.invoices.find(
    (inv) => inv.status !== "paid" && inv.hostedUrl
  )

  return (
    <CoachSessionsView
      locale={locale}
      pendingRequests={pending.requests}
      sessions={calendar.sessions}
      freeFirstSession={settings.freeFirstSession}
      paymentCollection={settings.paymentCollection}
      acquisitionBlocked={unpaid}
      acquisitionPayHref={openInvoice?.hostedUrl ?? ROUTES.billing}
      loadFailed={
        pending.loadFailed || calendar.loadFailed || settings.loadFailed
      }
      labels={buildCoachBookingLabels(t, sportLabels)}
    />
  )
}
