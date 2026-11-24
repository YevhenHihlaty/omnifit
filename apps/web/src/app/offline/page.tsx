"use client"

import Link from "next/link"
import { OrbitMark } from "@omnifit/ui"
import { WifiOff } from "lucide-react"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import { ROUTES } from "@/lib/routes"

export default function NetworkErrorPage() {
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="px-6 py-7">
        <Link
          href={ROUTES.home}
          className="inline-flex items-center gap-2 font-display text-lg font-bold text-ink-900"
          aria-label="OmniFit"
        >
          <OrbitMark size={24} className="text-pine" title="OmniFit" />
          OmniFit
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-md flex-col items-center rounded-[18px] border border-stone-300 bg-surface px-10 py-11 text-center">
          <div className="mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-danger-tint text-danger">
            <WifiOff className="h-9 w-9" aria-hidden />
          </div>
          <h1 className="font-display text-[22px] font-bold text-ink-900">
            {t("errors.networkTitle")}
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-500">
            {t("errors.networkBody")}
          </p>
          <p className="mt-5 rounded-md bg-stone-150 px-2.5 py-1 font-mono text-xs text-ink-500">
            {t("errors.networkCode")}
          </p>
          <button
            type="button"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-pine text-sm font-semibold text-cream hover:bg-pine-dark"
            onClick={() => window.location.reload()}
          >
            {t("errors.retry")}
          </button>
          <a
            href="mailto:support@omnifit.app"
            className="mt-4 text-sm font-semibold text-ink-700 hover:underline"
          >
            {t("errors.contactSupport")}
          </a>
        </div>
      </div>
    </div>
  )
}
