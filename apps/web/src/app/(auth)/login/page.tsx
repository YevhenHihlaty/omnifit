import { OrbitMark } from "@omnifit/ui"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/LoginForm"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { t } = await getServerTranslator()
  const params = await searchParams
  const next = params.next ?? ""
  const resetSuccess = params.reset === "success"

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <OrbitMark size={28} title="OmniFit" />
        <span className="font-display text-xl font-bold text-pine">OmniFit</span>
      </div>

      <h1 className="font-display text-3xl font-bold text-ink-900">{t("auth.welcomeBack")}</h1>
      <p className="mt-2 text-sm text-ink-500">{t("auth.loginSubtitle")}</p>

      {resetSuccess && (
        <p role="status" className="mt-4 rounded-lg bg-pine-tint px-4 py-3 text-sm text-pine-dark">
          {t("auth.passwordUpdated")}
        </p>
      )}

      <LoginForm
        labels={{
          signIn: t("auth.signIn"),
          signingIn: t("auth.signingIn"),
          email: t("auth.email"),
          password: t("auth.password"),
          forgotPassword: t("auth.forgotPassword"),
          noAccount: t("auth.noAccount"),
          register: t("auth.register"),
          invalidCredentials: t("auth.invalidCredentials"),
          showPassword: t("auth.showPassword"),
          hidePassword: t("auth.hidePassword"),
        }}
        next={next || undefined}
      />
    </div>
  )
}
