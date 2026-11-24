import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { getCoachRosterUsage } from "@/features/client-invite/queries"
import { getCoachProfileHub } from "@/features/coach-profile/queries"
import { SubscriptionBillingView } from "@/features/coach-billing/SubscriptionBillingView"
import {
  coachHasUnpaidAcquisition,
  listCoachAcquisitionInvoices,
} from "@/features/payments/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("billing.title") }
}

export default async function CoachBillingPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const [usage, hubResult, invoiceResult, unpaid] = await Promise.all([
    getCoachRosterUsage(),
    getCoachProfileHub(),
    listCoachAcquisitionInvoices(),
    coachHasUnpaidAcquisition(),
  ])

  return (
    <SubscriptionBillingView
      usage={usage}
      connectStatus={hubResult.hub?.stripeConnectStatus ?? "none"}
      acquisitionInvoices={invoiceResult.invoices}
      acquisitionBlocked={unpaid}
      loadFailed={usage === null}
      loadFailedLabel={t("billing.loadFailed")}
      labels={{
        title: t("billing.title"),
        subtitle: t("billing.subtitle"),
        sectionPlan: t("billing.sectionPlan"),
        sectionPayouts: t("billing.sectionPayouts"),
        sectionAcquisition: t("billing.sectionAcquisition"),
        acquisitionEmptyTitle: t("billing.acquisitionEmptyTitle"),
        acquisitionEmpty: t("billing.acquisitionEmpty"),
        acquisitionBlocked: t("billing.acquisitionBlocked"),
        acquisitionPayCta: t("billing.acquisitionPayCta"),
        acquisitionStatus: {
          draft: t("billing.acquisitionStatus.draft"),
          open: t("billing.acquisitionStatus.open"),
          paid: t("billing.acquisitionStatus.paid"),
          void: t("billing.acquisitionStatus.void"),
          uncollectible: t("billing.acquisitionStatus.uncollectible"),
        },
        freeName: t("billing.freeName"),
        freeDesc: t("billing.freeDesc"),
        freeFeat1: t("billing.freeFeat1"),
        freeFeat2: t("billing.freeFeat2"),
        freeFeat3: t("billing.freeFeat3"),
        currentPlanCta: t("billing.currentPlanCta"),
        currentBadge: t("billing.currentBadge"),
        usageLabel: t("billing.usageLabel"),
        usageOf: t("billing.usageOf"),
        proName: t("billing.proName"),
        proPrice: t("billing.proPrice"),
        proPriceSuffix: t("billing.proPriceSuffix"),
        proDesc: t("billing.proDesc"),
        proFeat1: t("billing.proFeat1"),
        proFeat2: t("billing.proFeat2"),
        proFeat3: t("billing.proFeat3"),
        proFeat3Soon: t("billing.proFeat3Soon"),
        upgradeCta: t("billing.upgradeCta"),
        upgradeDisabled: t("billing.upgradeDisabled"),
        proActiveTitle: t("billing.proActiveTitle"),
        proActiveSubtitle: t("billing.proActiveSubtitle"),
        manageBillingSoon: t("billing.manageBillingSoon"),
        payoutConnectedTitle: t("billing.payoutConnectedTitle"),
        payoutConnectedBody: t("billing.payoutConnectedBody"),
        payoutPendingTitle: t("billing.payoutPendingTitle"),
        payoutPendingBody: t("billing.payoutPendingBody"),
        payoutVerifyingTitle: t("billing.payoutVerifyingTitle"),
        payoutVerifyingBody: t("billing.payoutVerifyingBody"),
        connectedBadge: t("billing.connectedBadge"),
        notConnectedBadge: t("billing.notConnectedBadge"),
        verifyingBadge: t("billing.verifyingBadge"),
        connectCta: t("billing.connectCta"),
        connectPending: t("billing.connectPending"),
        connectFinishCta: t("billing.connectFinishCta"),
        connectErrors: {
          not_authenticated: t("billing.connectErrors.not_authenticated"),
          coach_profile_incomplete: t(
            "billing.connectErrors.coach_profile_incomplete"
          ),
          connect_failed: t("billing.connectErrors.connect_failed"),
          update_failed: t("billing.connectErrors.update_failed"),
          generic: t("billing.connectErrors.generic"),
        },
        viewHistorySoon: t("billing.viewHistorySoon"),
        backToSettings: t("billing.backToSettings"),
      }}
    />
  )
}
