"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { OrbitMark } from "@omnifit/ui"
import { ROUTES } from "@/lib/routes"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"

const SIGNUP_BENEFIT_KEYS = [
  "auth.signupBenefit1",
  "auth.signupBenefit2",
  "auth.signupBenefit3",
  "auth.signupBenefit4",
] as const

const GENERIC_BENEFIT_KEYS = [
  "auth.genericBenefit1",
  "auth.genericBenefit2",
  "auth.genericBenefit3",
  "auth.genericBenefit4",
] as const

type PanelMode = "login" | "register" | "generic"

const resolveMode = (pathname: string): PanelMode => {
  if (pathname.startsWith(ROUTES.register)) return "register"
  if (pathname.startsWith(ROUTES.login)) return "login"
  return "generic"
}

/** Brand panel: quote on login; checklist on register; value props on verify/reset. */
export const AuthBrandPanel = () => {
  const pathname = usePathname()
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const mode = resolveMode(pathname)

  return (
    <aside className="relative hidden flex-col justify-between bg-ink-900 px-10 py-12 text-cream lg:flex">
      <Link href={ROUTES.home} className="flex items-center gap-2 font-display text-xl font-bold">
        <OrbitMark size={28} className="text-pine" />
        <span>OmniFit</span>
      </Link>

      {mode === "login" ? (
        <blockquote className="max-w-md space-y-4">
          <p className="font-display text-[26px] font-medium leading-snug text-balance">
            “{t("auth.loginQuote")}”
          </p>
          <footer className="flex items-center gap-3 text-sm text-stone-300">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/10 font-display text-sm font-semibold text-cream"
              aria-hidden
            >
              {t("auth.loginQuoteInitials")}
            </span>
            <div>
              <cite className="not-italic font-semibold text-cream">{t("auth.loginQuoteName")}</cite>
              <p className="text-xs text-stone-300">{t("auth.loginQuoteRole")}</p>
            </div>
          </footer>
        </blockquote>
      ) : (
        <div className="max-w-md space-y-6">
          {mode === "register" && (
            <p className="text-xs font-semibold uppercase tracking-wider text-pine">
              {t("auth.signupEyebrow")}
            </p>
          )}
          {mode === "generic" && (
            <p className="text-xs font-semibold uppercase tracking-wider text-pine">
              {t("auth.genericEyebrow")}
            </p>
          )}
          <h2 className="font-display text-2xl font-semibold leading-snug text-balance">
            {t(mode === "register" ? "auth.signupPanelTitle" : "auth.genericPanelTitle")}
          </h2>
          <ul className="space-y-3">
            {(mode === "register" ? SIGNUP_BENEFIT_KEYS : GENERIC_BENEFIT_KEYS).map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm text-stone-300">
                <span className="mt-0.5 text-pine" aria-hidden>
                  ✓
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-stone-300">
        © {new Date().getFullYear()} OmniFit. {t("footer.rights")}
      </p>
    </aside>
  )
}
