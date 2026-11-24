import Link from "next/link"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { LOCALES, type Locale } from "@/lib/i18n/constants"
import { ClientAccountSettings } from "@/features/client-settings/ClientAccountSettings"
import type { Metadata } from "next"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("meta.settings") }
}

export default async function ClientSettingsIndexPage() {
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let preferred: Locale = locale
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", user.id)
      .maybeSingle()
    if (data?.locale && LOCALES.includes(data.locale as Locale)) {
      preferred = data.locale as Locale
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-900">
        {t("clientSettings.title")}
      </h1>
      <p className="mt-1 text-sm text-ink-500">{t("clientSettings.subtitle")}</p>

      <ul className="mt-8 flex flex-col gap-3">
        <li>
          <Link
            href={ROUTES.clientMyCoaches}
            className="flex min-h-11 items-center justify-between rounded-[10px] border border-stone-300 bg-surface px-4 py-4 text-sm font-semibold text-ink-900 transition-colors hover:border-pine"
          >
            <span>{t("clientSettings.myCoachesLink")}</span>
            <span className="text-ink-500" aria-hidden>
              →
            </span>
          </Link>
        </li>
      </ul>

      <ClientAccountSettings
        currentLocale={preferred}
        labels={{
          localeTitle: t("clientSettings.localeTitle"),
          localeSubtitle: t("clientSettings.localeSubtitle"),
          localeLabel: t("clientSettings.localeLabel"),
          localeSave: t("clientSettings.localeSave"),
          saving: t("clientSettings.saving"),
          saved: t("clientSettings.saved"),
          dangerTitle: t("clientSettings.dangerTitle"),
          dangerBody: t("clientSettings.dangerBody"),
          deleteCta: t("clientSettings.deleteCta"),
          deleteConfirm: t("clientSettings.deleteConfirm"),
          deleteCancel: t("clientSettings.deleteCancel"),
          deleting: t("clientSettings.deleting"),
          langEn: t("nav.langEn"),
          langPl: t("nav.langPl"),
          langUk: t("nav.langUk"),
          errors: {
            invalid_locale: t("clientSettings.errors.invalid_locale"),
            not_authenticated: t("clientSettings.errors.not_authenticated"),
            update_failed: t("clientSettings.errors.update_failed"),
            anonymize_failed: t("clientSettings.errors.anonymize_failed"),
            already_anonymized: t("clientSettings.errors.already_anonymized"),
          },
        }}
      />
    </div>
  )
}
