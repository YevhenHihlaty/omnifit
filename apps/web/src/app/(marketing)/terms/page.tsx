import type { Metadata } from "next"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { marketingMetadata } from "@/lib/seo/metadata"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return marketingMetadata({
    title: t("legal.termsTitle"),
    description: t("legal.termsMeta"),
    path: "/terms",
  })
}

export default async function TermsPage() {
  const { t } = await getServerTranslator()
  const sections = [
    ["legal.termsS1Title", "legal.termsS1Body"],
    ["legal.termsS2Title", "legal.termsS2Body"],
    ["legal.termsS3Title", "legal.termsS3Body"],
    ["legal.termsS4Title", "legal.termsS4Body"],
  ] as const

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink-900">
        {t("legal.termsTitle")}
      </h1>
      <p className="mt-2 text-sm text-ink-500">{t("legal.updated")}</p>
      <p
        role="note"
        className="mt-6 rounded-[12px] border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-ink-900"
      >
        {t("legal.counselNote")}
      </p>
      <p className="mt-6 max-w-prose text-pretty text-base text-ink-700">
        {t("legal.termsIntro")}
      </p>
      <div className="mt-10 flex flex-col gap-8">
        {sections.map(([titleKey, bodyKey]) => (
          <section key={titleKey}>
            <h2 className="font-display text-xl font-semibold text-ink-900">
              {t(titleKey)}
            </h2>
            <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-ink-700">
              {t(bodyKey)}
            </p>
          </section>
        ))}
      </div>
    </article>
  )
}
