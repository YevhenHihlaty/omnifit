import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { ROUTES } from "@/lib/routes"
import { marketingMetadata } from "@/lib/seo/metadata"
import { PricingFaq } from "@/features/marketing/PricingFaq"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return marketingMetadata({
    title: t("pricing.metaTitle"),
    description: t("pricing.metaDescription"),
    path: "/pricing",
  })
}

export default async function PricingPage() {
  const { t } = await getServerTranslator()

  const freeFeatures = [
    t("pricing.free.feature1"),
    t("pricing.free.feature2"),
    t("pricing.free.feature3"),
    t("pricing.free.feature4"),
  ]
  const proFeatures = [
    t("pricing.pro.feature1"),
    t("pricing.pro.feature2"),
    t("pricing.pro.feature3"),
    t("pricing.pro.feature4"),
    t("pricing.pro.feature5"),
  ]
  const teamFeatures = [
    t("pricing.team.feature1"),
    t("pricing.team.feature2"),
    t("pricing.team.feature3"),
  ]

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="font-display text-balance text-4xl font-bold text-ink-900">
            {t("pricing.title")}
          </h1>
          <p className="mt-3 text-pretty text-ink-500">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col rounded-[20px] border border-stone-300 bg-surface p-8">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {t("pricing.free.name")}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t("pricing.free.blurb")}</p>
            <p className="mt-5 font-display text-[38px] font-bold leading-none tabular-nums text-ink-900">
              $0
              <span className="text-sm font-medium text-ink-500">
                {t("pricing.perMonth")}
              </span>
            </p>
            <Link
              href={ROUTES.register}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[10px] border-[1.5px] border-stone-300 px-4 text-center text-sm font-semibold text-ink-900 hover:bg-stone-150"
            >
              {t("pricing.getStarted")}
            </Link>
            <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-stone-150 pt-5 text-sm text-ink-700">
              {freeFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-pine-dark"
                    aria-hidden
                  />
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex flex-col rounded-[20px] border border-ink-900 bg-ink-900 p-8 text-cream">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#8FB89B] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-900">
              {t("pricing.popular")}
            </span>
            <h2 className="font-display text-lg font-semibold">{t("pricing.pro.name")}</h2>
            <p className="mt-1 text-sm text-[#9CA69C]">{t("pricing.pro.blurb")}</p>
            <p className="mt-5 font-display text-[38px] font-bold leading-none tabular-nums">
              $29
              <span className="text-sm font-medium text-[#9CA69C]">
                {t("pricing.perMonth")}
              </span>
            </p>
            <Link
              href={ROUTES.register}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[#8FB89B] px-4 text-center text-sm font-bold text-ink-900 hover:bg-[#7da88a]"
            >
              {t("pricing.startPro")}
            </Link>
            <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-white/15 pt-5 text-sm">
              {proFeatures.map((feat, i) => {
                const muted = i === proFeatures.length - 1
                return (
                  <li
                    key={feat}
                    className={`flex items-start gap-2.5 ${muted ? "text-[#9CA69C]" : ""}`}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${muted ? "text-[#9CA69C]" : "text-[#8FB89B]"}`}
                      aria-hidden
                    />
                    {feat}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex flex-col rounded-[20px] border border-stone-300 bg-surface p-8 opacity-65">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {t("pricing.team.name")}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t("pricing.team.subtitle")}</p>
            <p className="mt-5 font-display text-[22px] font-bold text-ink-500">
              {t("pricing.team.comingSoon")}
            </p>
            <button
              type="button"
              disabled
              className="mt-6 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-[10px] border-[1.5px] border-stone-300 bg-stone-150 px-4 text-sm font-semibold text-ink-500"
            >
              {t("pricing.team.notify")}
            </button>
            <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-stone-150 pt-5 text-sm text-ink-500">
              {teamFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-ink-500"
                    aria-hidden
                  />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <PricingFaq
          title={t("pricing.faqTitle")}
          items={[
            { q: t("pricing.faq1q"), a: t("pricing.faq1a") },
            { q: t("pricing.faq2q"), a: t("pricing.faq2a") },
            { q: t("pricing.faq3q"), a: t("pricing.faq3a") },
          ]}
        />
      </section>

      <section className="bg-ink-900 px-4 py-16 text-center md:py-20">
        <h2 className="font-display text-2xl font-bold text-cream md:text-3xl">
          {t("pricing.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-stone-300 md:text-base">
          {t("pricing.ctaBody")}
        </p>
        <Link
          href={ROUTES.register}
          className="mt-8 inline-flex min-h-11 items-center rounded-[10px] bg-pine px-7 text-sm font-semibold text-cream hover:bg-pine-dark"
        >
          {t("pricing.getStarted")}
        </Link>
      </section>
    </>
  )
}
