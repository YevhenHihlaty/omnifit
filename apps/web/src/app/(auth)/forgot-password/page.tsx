"use client"

import { useActionState, useTransition, useState } from "react"
import { Input, Button } from "@omnifit/ui"
import { requestPasswordReset } from "@/features/auth/actions"
import type { ActionResult } from "@/features/auth/actions"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"

export default function ForgotPasswordPage() {
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const [state, action, isPending] = useActionState<ActionResult, FormData>(
    requestPasswordReset,
    null
  )
  const [resendPending, startResend] = useTransition()
  const [resent, setResent] = useState(false)

  const succeeded = state !== null && "ok" in state && state.ok
  const failed = state !== null && "error" in state
  const email = succeeded && "email" in state && state.email ? state.email : ""

  const handleResend = () => {
    if (!email) return
    startResend(async () => {
      const fd = new FormData()
      fd.set("email", email)
      await requestPasswordReset(null, fd)
      setResent(true)
    })
  }

  if (succeeded) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-pine-tint text-pine-dark"
          aria-hidden
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-ink-900">{t("auth.checkYourEmail")}</h1>
        <p className="mt-4 text-sm text-ink-500">{t("auth.checkEmail")}</p>
        {email && <p className="mt-2 font-medium text-ink-900">{email}</p>}
        <p className="mt-3 text-sm text-ink-500">{t("auth.resetLinkExpires")}</p>

        <Link
          href={ROUTES.login}
          className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-pine px-4 text-sm font-semibold text-surface transition-colors hover:bg-pine-dark"
        >
          {t("auth.backToSignIn")}
        </Link>

        {email && (
          <button
            type="button"
            disabled={resendPending}
            className="mt-4 text-sm font-medium text-plum-dark hover:underline disabled:opacity-50"
            onClick={handleResend}
          >
            {resent ? t("auth.resendSent") : t("auth.resendEmail")}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-3xl font-bold text-ink-900">{t("auth.resetPassword")}</h1>
      <p className="mt-2 text-sm text-ink-500">{t("auth.resetPasswordSubtitle")}</p>

      {failed && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {t("auth.invalidEmail")}
        </p>
      )}

      <form className="mt-8 flex flex-col gap-5" action={action}>
        <Input label={t("auth.email")} type="email" name="email" autoComplete="email" required />
        <Button type="submit" className="mt-1 w-full bg-pine hover:bg-pine-dark" disabled={isPending}>
          {isPending ? t("auth.sending") : t("auth.sendResetLink")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        {t("auth.rememberedPassword")}{" "}
        <Link href={ROUTES.login} className="font-medium text-pine-dark hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  )
}
