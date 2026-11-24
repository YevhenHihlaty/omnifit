"use client"

import { OrbitMark } from "@omnifit/ui"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import { ROUTES } from "@/lib/routes"
import Link from "next/link"

export const MarketingFooter = () => {
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-stone-300 bg-stone-150">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-pine">
            <OrbitMark size={24} title="OmniFit" />
            <span>OmniFit</span>
          </div>
          <p className="max-w-xs text-pretty text-sm text-ink-500">{t("footer.tagline")}</p>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold text-ink-900">{t("footer.product")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>
              <Link href="/#product" className="hover:text-pine">
                {t("nav.product")}
              </Link>
            </li>
            <li>
              <Link href={ROUTES.pricing} className="hover:text-pine">
                {t("nav.pricing")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold text-ink-900">{t("footer.company")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>
              <a href="mailto:support@omnifit.app" className="hover:text-pine">
                {t("footer.contact")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold text-ink-900">{t("footer.legal")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>
              <Link href={ROUTES.privacy} className="hover:text-pine">
                {t("nav.privacy")}
              </Link>
            </li>
            <li>
              <Link href={ROUTES.terms} className="hover:text-pine">
                {t("nav.terms")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-300 py-4 text-center text-xs text-ink-500">
        © {year} OmniFit. {t("footer.rights")}
      </div>
    </footer>
  )
}
