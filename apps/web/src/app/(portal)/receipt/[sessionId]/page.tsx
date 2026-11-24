import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { loadPaymentReceipt } from "@/features/payments/checkout-queries"
import { reconcilePaidCheckout } from "@/features/payments/reconcile-checkout"
import { PaymentReceiptView } from "@/features/payments/PaymentReceiptView"
import { formatSessionTimeRange } from "@/features/coaching-booking/calendar-format"

type PageProps = {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ cs?: string }>
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("receipt.title") }
}

export default async function PaymentReceiptPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params
  const { cs } = await searchParams
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  let receipt = await loadPaymentReceipt(sessionId)
  if (!receipt) notFound()

  if (
    receipt.paymentStatus !== "paid" &&
    receipt.paymentStatus !== "paid_offline"
  ) {
    const { paid } = await reconcilePaidCheckout({
      omnifitSessionId: sessionId,
      stripeCheckoutSessionId: cs,
    })
    if (paid) {
      receipt = await loadPaymentReceipt(sessionId)
      if (!receipt) notFound()
    }
  }

  if (
    receipt.paymentStatus !== "paid" &&
    receipt.paymentStatus !== "paid_offline"
  ) {
    redirect(
      receipt.role === "client" ? ROUTES.clientCalendar : ROUTES.sessions
    )
  }

  const whenLabel = formatSessionTimeRange(
    receipt.startsAt,
    receipt.endsAt,
    locale
  )

  return (
    <PaymentReceiptView
      receipt={receipt}
      whenLabel={whenLabel}
      labels={{
        title: t("receipt.title"),
        clientHeading: t("receipt.clientHeading"),
        clientSub: t("receipt.clientSub"),
        coachHeading: t("receipt.coachHeading"),
        coachSub: t("receipt.coachSub"),
        offlineHeading: t("receipt.offlineHeading"),
        offlineSub: t("receipt.offlineSub"),
        sessionPrice: t("receipt.sessionPrice"),
        serviceFee: t("receipt.serviceFee"),
        totalCharged: t("receipt.totalCharged"),
        amountCollected: t("receipt.amountCollected"),
        paidOfflinePill: t("receipt.paidOfflinePill"),
        stripeFee: t("receipt.stripeFee"),
        stripeFeeHint: t("receipt.stripeFeeHint"),
        netPayout: t("receipt.netPayout"),
        coachNote: t("receipt.coachNote"),
        withCoach: t("receipt.withCoach"),
        withClient: t("receipt.withClient"),
        backCalendar: t("receipt.backCalendar"),
        viewPayouts: t("receipt.viewPayouts"),
        backSessions: t("receipt.backSessions"),
      }}
    />
  )
}
