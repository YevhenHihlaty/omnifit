"use client"

import { OrbitMark } from "@omnifit/ui"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import { ROUTES } from "@/lib/routes"
import Link from "next/link"
import { LocaleSwitcher } from "./LocaleSwitcher"

export const MarketingHeader = () => {
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)

  return (
    <header className="sticky top-0 z-50 border-b border-stone-300 bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 font-display text-xl font-bold text-pine"
          aria-label="OmniFit home"
        >
          <OrbitMark size={28} title="OmniFit" />
          <span>OmniFit</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          <Link
            href="/#product"
            className="text-sm font-medium text-ink-700 transition-colors hover:text-pine"
          >
            {t("nav.product")}
          </Link>
          <Link
            href={ROUTES.pricing}
            className="text-sm font-medium text-ink-700 transition-colors hover:text-pine"
          >
            {t("nav.pricing")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher />

          <Link
            href={ROUTES.login}
            className="hidden text-sm font-medium text-ink-900 transition-colors hover:text-pine sm:inline"
          >
            {t("auth.signIn")}
          </Link>

          <Link
            href={ROUTES.register}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-ink-900 px-4 text-sm font-semibold text-cream transition-colors duration-fast hover:bg-ink-700 btn-press"
          >
            {t("auth.startFreeTrial")}
          </Link>
        </div>
      </div>
    </header>
  )
}
