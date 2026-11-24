import { OrbitMark } from "@omnifit/ui"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import type { Metadata } from "next"
import { RegisterForm } from "@/components/auth/RegisterForm"

export const metadata: Metadata = { title: "Create account" }

export default async function RegisterPage() {
  const { t } = await getServerTranslator()

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <OrbitMark size={28} title="OmniFit" />
        <span className="font-display text-xl font-bold text-pine">OmniFit</span>
      </div>

      <h1 className="font-display text-3xl font-bold text-ink-900">{t("auth.createAccount")}</h1>
      <p className="mt-2 text-sm text-ink-500">{t("auth.coachSignupSubtitle")}</p>

      <RegisterForm
        labels={{
          createAccount: t("auth.createAccount"),
          creating: t("auth.creating"),
          email: t("auth.email"),
          password: t("auth.password"),
          confirmPassword: t("auth.confirmPassword"),
          passwordStrength: t("auth.passwordStrength"),
          strengthWeak: t("auth.strengthWeak"),
          strengthFair: t("auth.strengthFair"),
          strengthStrong: t("auth.strengthStrong"),
          displayName: t("auth.displayName"),
          phone: t("auth.phone"),
          phoneHint: t("auth.phoneHint"),
          phonePlaceholder: t("auth.phonePlaceholder"),
          haveAccount: t("auth.haveAccount"),
          signIn: t("auth.signIn"),
          signupError: t("auth.signupError"),
          termsPrefix: t("auth.termsPrefix"),
          termsLink: t("auth.termsLink"),
          and: t("auth.and"),
          privacyLink: t("auth.privacyLink"),
          termsRequired: t("auth.termsRequired"),
          startFreeTrial: t("auth.startFreeTrial"),
        }}
      />
    </div>
  )
}
