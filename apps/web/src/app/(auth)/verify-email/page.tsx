import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { VerifyEmailView } from "@/components/auth/VerifyEmailView"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Verify email" }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { t } = await getServerTranslator()
  const params = await searchParams
  const email = params.email ?? ""

  return (
    <VerifyEmailView
      email={email}
      labels={{
        checkYourEmail: t("auth.checkYourEmail"),
        verifyEmailSent: t("auth.verifyEmailSent"),
        verifyEmailInstructions: t("auth.verifyEmailInstructions"),
        openEmailApp: t("auth.openEmailApp"),
        resendEmail: t("auth.resendEmail"),
        resendSent: t("auth.resendSent"),
        wrongEmail: t("auth.wrongEmail"),
        goBackEdit: t("auth.goBackEdit"),
      }}
    />
  )
}
