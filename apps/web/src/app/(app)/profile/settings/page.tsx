import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { coachMarketplaceEnabled } from "@/lib/feature-flags"
import { CoachProfileShell } from "@/features/coach-profile/CoachProfileShell"
import { CoachSettingsPanel } from "@/features/coach-profile/CoachSettingsPanel"
import { getCoachProfileHub } from "@/features/coach-profile/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("coachProfile.settingsMeta") }
}

export default async function CoachProfileSettingsPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const hubResult = await getCoachProfileHub()
  if (!hubResult.hub) redirect(ROUTES.dashboard)

  return (
    <CoachProfileShell
      displayName={hubResult.hub.displayName}
      avatarUrl={hubResult.hub.avatarUrl}
      specialties={hubResult.hub.specialties}
      activeTab="settings"
      labels={{
        plans: t("coachProfile.tabPlans"),
        locations: t("coachProfile.tabLocations"),
        credentials: t("coachProfile.tabCredentials"),
        settings: t("coachProfile.tabSettings"),
        tabsLabel: t("coachProfile.tabsLabel"),
        editProfile: t("coachProfile.editProfile"),
        viewPublicProfile: t("coachProfile.viewPublicProfile"),
      }}
    >
      <CoachSettingsPanel
        hub={hubResult.hub}
        marketplaceFlagOn={coachMarketplaceEnabled()}
        labels={{
          practiceTitle: t("coachProfile.practiceTitle"),
          practiceName: t("coachProfile.practiceName"),
          practiceSlug: t("coachProfile.practiceSlug"),
          practiceSlugHint: t("coachProfile.practiceSlugHint"),
          practiceHelp: t("coachProfile.practiceHelp"),
          practiceSave: t("coachProfile.practiceSave"),
          currentPlanLabel: t("coachProfile.currentPlanLabel"),
          manageBilling: t("coachProfile.manageBilling"),
          notificationsTitle: t("coachProfile.notificationsTitle"),
          notifyPush: t("coachProfile.notifyPush"),
          notifyEmail: t("coachProfile.notifyEmail"),
          notifyBooking: t("coachProfile.notifyBooking"),
          paymentTitle: t("coachProfile.paymentTitle"),
          paymentSubtitle: t("coachProfile.paymentSubtitle"),
          payInApp: t("coachProfile.payInApp"),
          payInAppHint: t("coachProfile.payInAppHint"),
          payDirect: t("coachProfile.payDirect"),
          payDirectHint: t("coachProfile.payDirectHint"),
          stripeRequired: t("coachProfile.stripeRequired"),
          connectCta: t("coachProfile.connectCta"),
          connectPending: t("coachProfile.connectPending"),
          connectPendingHint: t("coachProfile.connectPendingHint"),
          connectErrors: {
            not_authenticated: t("coachProfile.errors.not_authenticated"),
            coach_profile_incomplete: t(
              "coachProfile.errors.coach_profile_incomplete"
            ),
            connect_failed: t("coachProfile.errors.connect_failed"),
            update_failed: t("coachProfile.errors.update_failed"),
            stripe_not_ready: t("coachProfile.errors.stripe_not_ready"),
            generic: t("coachProfile.errors.generic"),
          },
          marketplaceTitle: t("coachProfile.marketplaceTitle"),
          marketplaceLabel: t("coachProfile.marketplaceLabel"),
          marketplaceHint: t("coachProfile.marketplaceHint"),
          marketplaceFlagOff: t("coachProfile.marketplaceFlagOff"),
          feeTitle: t("coachProfile.feeTitle"),
          feeStripeHandles: t("coachProfile.feeStripeHandles"),
          feeProcessing: t("coachProfile.feeProcessing"),
          feeServiceFree: t("coachProfile.feeServiceFree"),
          feeServicePro: t("coachProfile.feeServicePro"),
          feeAcquisition: t("coachProfile.feeAcquisition"),
          accountTitle: t("coachProfile.accountTitle"),
          billingLink: t("coachProfile.billingLink"),
          helpLink: t("coachProfile.helpLink"),
          signOut: t("coachProfile.signOut"),
          freePlan: t("coachProfile.freePlan"),
          proPlan: t("coachProfile.proPlan"),
          save: t("coachProfile.save"),
          saving: t("coachProfile.saving"),
          saved: t("coachProfile.saved"),
          errors: {
            not_authenticated: t("coachProfile.errors.not_authenticated"),
            update_failed: t("coachProfile.errors.update_failed"),
            stripe_required: t("coachProfile.errors.stripe_required"),
            stripe_not_ready: t("coachProfile.errors.stripe_not_ready"),
            invalid_payment_collection: t(
              "coachProfile.errors.invalid_payment_collection"
            ),
            name_required: t("coachProfile.errors.name_required"),
            org_not_found: t("coachProfile.errors.org_not_found"),
          },
        }}
      />
    </CoachProfileShell>
  )
}
