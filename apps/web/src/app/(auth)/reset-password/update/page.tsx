"use client"

import { useActionState } from "react"
import { Input, Button } from "@omnifit/ui"
import { updatePassword } from "@/features/auth/actions"
import type { ActionResult } from "@/features/auth/actions"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"

export default function ResetPasswordUpdatePage() {
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const [state, action, isPending] = useActionState<ActionResult, FormData>(updatePassword, null)

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-3xl font-bold text-ink-900">{t("auth.newPassword")}</h1>

      {state && "error" in state && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {t("auth.updatePasswordError")}
        </p>
      )}

      <form className="mt-8 flex flex-col gap-5" action={action}>
        <Input
          label={t("auth.password")}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Button type="submit" className="mt-1 w-full bg-pine hover:bg-pine-dark" disabled={isPending}>
          {isPending ? t("auth.saving") : t("auth.saveNewPassword")}
        </Button>
      </form>
    </div>
  )
}
