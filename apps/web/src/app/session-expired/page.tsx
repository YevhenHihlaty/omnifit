import { OrbitMark } from "@omnifit/ui"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { signOut } from "@/features/auth/actions"
import { ROUTES } from "@/lib/routes"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Session expired" }

/** Design Doc Web-SessionExpired: cream page, surface card, lock icon, pine CTA. */
export default async function SessionExpiredPage() {
  const { t } = await getServerTranslator()

  return (
    <main className="flex min-h-screen flex-col bg-cream px-4 py-10">
      <header className="mx-auto flex w-full max-w-lg items-center gap-2">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
          <OrbitMark size={24} className="text-pine" />
          OmniFit
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        <div className="w-full rounded-[18px] border border-stone-300 bg-surface px-8 py-10 text-center shadow-sm">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning-tint text-warning"
            aria-hidden
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            {t("auth.sessionExpired")}
          </h1>
          <p className="mt-4 text-pretty text-sm text-ink-500">{t("auth.sessionExpiredDescription")}</p>

          <form action={signOut}>
            <button
              type="submit"
              className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-pine px-4 text-sm font-semibold text-surface transition-colors hover:bg-pine-dark"
            >
              {t("auth.logInAgain")}
            </button>
          </form>

          <a
            href="mailto:support@omnifit.app"
            className="mt-4 inline-block text-sm font-medium text-plum-dark hover:underline"
          >
            {t("auth.contactSupport")}
          </a>
        </div>
      </div>
    </main>
  )
}
