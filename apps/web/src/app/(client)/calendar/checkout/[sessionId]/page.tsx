import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES, receiptPath } from "@/lib/routes"
import { stripeSessionCheckoutEnabled } from "@/lib/feature-flags"
import { loadClientCheckoutSession } from "@/features/payments/checkout-queries"
import { SessionCheckoutView } from "@/features/payments/SessionCheckoutView"
import { formatSessionTimeRange } from "@/features/coaching-booking/calendar-format"

type PageProps = {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ canceled?: string }>
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("checkout.title") }
}

export default async function ClientCheckoutPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params
  const { canceled } = await searchParams
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  if (!stripeSessionCheckoutEnabled()) {
    redirect(ROUTES.clientCalendar)
  }

  const session = await loadClientCheckoutSession(sessionId)
  if (!session) notFound()

  if (
    session.paymentStatus === "paid" ||
    session.paymentStatus === "paid_offline"
  ) {
    redirect(receiptPath(session.sessionId))
  }

  if (session.paymentStatus !== "awaiting_payment" || session.sessionPriceCents <= 0) {
    redirect(ROUTES.clientCalendar)
  }

  const whenLabel = formatSessionTimeRange(
    session.startsAt,
    session.endsAt,
    locale
  )

  return (
    <SessionCheckoutView
      session={session}
      whenLabel={whenLabel}
      canceled={canceled === "1"}
      labels={{
        title: t("checkout.title"),
        subtitle: t("checkout.subtitle"),
        back: t("checkout.back"),
        sessionPrice: t("checkout.sessionPrice"),
        serviceFee: t("checkout.serviceFee"),
        totalDue: t("checkout.totalDue"),
        payCta: t("checkout.payCta"),
        payPending: t("checkout.payPending"),
        cancel: t("checkout.cancel"),
        note: t("checkout.note"),
        unpaidPill: t("checkout.unpaidPill"),
        failedPill: t("checkout.failedPill"),
        canceledMessage: t("checkout.canceledMessage"),
        withCoach: t("checkout.withCoach"),
        errors: {
          checkout_disabled: t("booking.paymentErrors.checkout_disabled"),
          not_found: t("booking.errors.not_found"),
          not_authenticated: t("booking.errors.not_authenticated"),
          forbidden: t("booking.paymentErrors.forbidden"),
          not_payable: t("booking.paymentErrors.not_payable"),
          missing_price: t("booking.paymentErrors.missing_price"),
          stripe_required: t("booking.paymentErrors.stripe_required"),
          stripe_not_ready: t("booking.paymentErrors.stripe_not_ready"),
          checkout_failed: t("booking.paymentErrors.checkout_failed"),
          generic: t("booking.errors.generic"),
        },
      }}
    />
  )
}
