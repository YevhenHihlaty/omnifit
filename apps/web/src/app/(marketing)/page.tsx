import type { Metadata } from "next"
import Link from "next/link"
import { Activity, CalendarDays, MessageSquare } from "lucide-react"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { ROUTES } from "@/lib/routes"
import { marketingMetadata } from "@/lib/seo/metadata"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return marketingMetadata({
    title: t("home.metaTitle"),
    description: t("home.metaDescription"),
    path: "/",
  })
}

export default async function HomePage() {
  const { t } = await getServerTranslator()

  const features = [
    {
      titleKey: "home.feature1Title" as const,
      bodyKey: "home.feature1Body" as const,
      tint: "bg-pine-tint text-pine-dark",
      Icon: MessageSquare,
    },
    {
      titleKey: "home.feature2Title" as const,
      bodyKey: "home.feature2Body" as const,
      tint: "bg-peach-tint text-peach-dark",
      Icon: Activity,
    },
    {
      titleKey: "home.feature3Title" as const,
      bodyKey: "home.feature3Body" as const,
      tint: "bg-sky-tint text-sky-dark",
      Icon: CalendarDays,
    },
  ]

  const stats = [
    ["home.stat1Value", "home.stat1Label"],
    ["home.stat2Value", "home.stat2Label"],
    ["home.stat3Value", "home.stat3Label"],
    ["home.stat4Value", "home.stat4Label"],
  ] as const

  return (
    <>
      <section className="relative overflow-hidden border-b border-stone-300">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--of-pine-tint)_0%,transparent_55%)]"
        />
        <div className="relative mx-auto grid min-h-[min(88vh,760px)] max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 md:grid-cols-[1fr_1fr] md:py-24 lg:grid-cols-[1fr_520px]">
          {/* Left column — copy */}
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit rounded-full bg-pine-tint px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-wide text-pine-dark">
              {t("home.eyebrow")}
            </span>
            <h1 className="text-balance font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl md:text-[2.75rem]">
              {t("home.tagline")}
            </h1>
            <p className="max-w-xl text-pretty text-base text-ink-700 sm:text-lg">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={ROUTES.register}
                className="inline-flex min-h-11 items-center rounded-[10px] bg-ink-900 px-6 text-sm font-semibold text-cream transition-colors hover:bg-ink-700"
              >
                {t("auth.startFreeTrial")}
              </Link>
              <Link
                href={ROUTES.pricing}
                className="group inline-flex min-h-11 items-center gap-2 rounded-[10px] border-[1.5px] border-ink-900 px-6 text-sm font-semibold text-ink-900 transition-colors hover:bg-stone-150"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {t("home.watchDemo")}
              </Link>
            </div>
            <p className="text-sm text-ink-500">{t("home.trialNote")}</p>
          </div>

          {/* Right column — product mockup */}
          <div className="relative hidden md:flex md:justify-center lg:justify-end" aria-hidden>
            <div className="w-full max-w-[460px] overflow-hidden rounded-[20px] border border-stone-300 bg-surface shadow-xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-stone-300 bg-stone-150 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                <span className="ml-3 h-4 flex-1 rounded-full bg-stone-200" />
              </div>
              {/* App mockup body */}
              <div className="flex" style={{ minHeight: 340 }}>
                {/* Sidebar */}
                <div className="flex w-14 shrink-0 flex-col items-center gap-4 border-r border-stone-200 bg-[var(--of-pine)] py-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={`h-7 w-7 rounded-xl ${i === 0 ? "bg-white/20" : "bg-white/10"}`} />
                  ))}
                </div>
                {/* Content area */}
                <div className="flex flex-1 flex-col gap-3 bg-[var(--of-cream)] p-4">
                  {/* Greeting */}
                  <div className="h-5 w-40 rounded-md bg-stone-300/60" />
                  <div className="h-3 w-24 rounded-md bg-stone-200/80" />
                  {/* Stat tiles */}
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-[10px] border border-stone-200 bg-surface p-2.5">
                        <div className="h-2.5 w-10 rounded bg-stone-200" />
                        <div className="mt-2 h-5 w-8 rounded bg-[var(--of-pine)]/30 font-bold" />
                      </div>
                    ))}
                  </div>
                  {/* Chart preview */}
                  <div className="rounded-[10px] border border-stone-200 bg-surface p-3">
                    <div className="mb-2 h-2.5 w-24 rounded bg-stone-200" />
                    <svg viewBox="0 0 240 60" className="w-full" aria-hidden>
                      <path d="M0,45 L30,38 L60,42 L90,30 L120,26 L150,20 L180,14 L210,10 L240,6" fill="none" stroke="var(--of-pine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M0,45 L30,38 L60,42 L90,30 L120,26 L150,20 L180,14 L210,10 L240,6 L240,60 L0,60 Z" fill="var(--of-pine)" opacity="0.08" />
                    </svg>
                  </div>
                  {/* Client rows */}
                  <div className="flex flex-col gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-[8px] border border-stone-200 bg-surface px-2.5 py-2">
                        <span className="h-6 w-6 rounded-full bg-[var(--of-pine-tint)]" />
                        <div className="flex-1">
                          <div className="h-2 w-20 rounded bg-stone-200" />
                          <div className="mt-1 h-1.5 w-12 rounded bg-stone-150" />
                        </div>
                        <span className="h-4 w-10 rounded-full bg-[var(--of-pine-tint)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-pine-tint/60 blur-3xl" />
          </div>
        </div>
      </section>

      <section
        aria-label={t("home.statsLabel")}
        className="border-b border-stone-300"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4 md:py-12">
          {stats.map(([valueKey, labelKey]) => (
            <div key={valueKey} className="text-center">
              <p className="font-display text-2xl font-bold text-ink-900 md:text-3xl">
                {t(valueKey)}
              </p>
              <p className="mt-1 text-sm text-ink-500">{t(labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="product"
        className="mx-auto max-w-6xl px-4 py-16 md:py-20"
        aria-labelledby="product-heading"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="product-heading"
            className="font-display text-2xl font-bold text-ink-900 md:text-3xl"
          >
            {t("home.productTitle")}
          </h2>
          <p className="mt-3 text-sm text-ink-500 md:text-base">
            {t("home.productSubtitle")}
          </p>
        </div>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map(({ titleKey, bodyKey, tint, Icon }) => (
            <li
              key={titleKey}
              className="flex flex-col gap-4 rounded-[18px] border border-stone-300 bg-surface p-6"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-display text-lg font-semibold text-ink-900">
                {t(titleKey)}
              </h3>
              <p className="text-sm leading-relaxed text-ink-700">
                {t(bodyKey)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <blockquote className="flex flex-col gap-6 rounded-3xl bg-pine-tint px-8 py-10 md:px-14 md:py-14">
          <p className="max-w-2xl font-display text-xl font-medium leading-relaxed text-ink-900 md:text-2xl">
            {t("home.testimonialQuote")}
          </p>
          <footer className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface font-display text-sm font-semibold text-ink-900"
            >
              {t("home.testimonialInitials")}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {t("home.testimonialName")}
              </p>
              <p className="text-sm text-pine-dark">
                {t("home.testimonialRole")}
              </p>
            </div>
          </footer>
        </blockquote>
      </section>

      <section className="bg-ink-900 px-4 py-16 text-center md:py-20">
        <h2 className="font-display text-2xl font-bold text-cream md:text-3xl">
          {t("home.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-stone-300 md:text-base">
          {t("home.ctaBody")}
        </p>
        <Link
          href={ROUTES.register}
          className="mt-8 inline-flex min-h-11 items-center rounded-[10px] bg-pine px-7 text-sm font-semibold text-cream hover:bg-pine-dark"
        >
          {t("auth.startFreeTrial")}
        </Link>
      </section>
    </>
  )
}
