import { MyCoachesView } from "@/features/client-settings/MyCoachesView"
import { listClientCoachesForUser } from "@/features/client-settings/list-client-coaches"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import type { Metadata } from "next"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("meta.myCoaches") }
}

export default async function ClientMyCoachesPage() {
  const { t } = await getServerTranslator()
  const coaches = await listClientCoachesForUser()

  return (
    <MyCoachesView
      coaches={coaches}
      labels={{
        title: t("clientMyCoaches.title"),
        subtitle: t("clientMyCoaches.subtitle"),
        emptyTitle: t("clientMyCoaches.emptyTitle"),
        emptyDescription: t("clientMyCoaches.emptyDescription"),
        leave: t("clientMyCoaches.leave"),
        leaving: t("clientMyCoaches.leaving"),
        since: t("clientMyCoaches.since"),
        leaveConfirm: t("clientMyCoaches.leaveConfirm"),
        leaveConfirmTitle: t("clientMyCoaches.leaveConfirmTitle"),
        leaveConfirmCancel: t("clientMyCoaches.leaveConfirmCancel"),
        leaveFailed: t("clientInvite.errors.leaveFailed"),
      }}
    />
  )
}
