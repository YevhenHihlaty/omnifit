"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@omnifit/ui"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import { inviteClientByEmail } from "@/features/client-invite/invite-client-by-email"
import { resolveInviteErrorMessage } from "@/features/client-invite/map-invite-error"
import type { ClientInviteDialogLabels } from "./labels"

type InlineInviteFormProps = {
  canInvite: boolean
  labels: ClientInviteDialogLabels
}

export const InlineInviteForm = ({ canInvite, labels }: InlineInviteFormProps) => {
  const router = useRouter()
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canInvite) return
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await inviteClientByEmail({ email })
      if (!result.success) {
        setError(resolveInviteErrorMessage(result.error, t))
        return
      }
      setSuccess(labels.successMessage.replace("{email}", result.email))
      setEmail("")
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[14px] border border-stone-300 bg-surface p-5 sm:flex-row sm:items-end"
    >
      <div className="min-w-0 flex-1">
        <Input
          label={labels.inlineEmailLabel}
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={!canInvite || isPending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={!canInvite || isPending}
        title={!canInvite ? labels.capMessage : undefined}
        className="min-h-[46px] shrink-0 sm:self-end"
      >
        {isPending ? labels.sendingCta : labels.inviteCta}
      </Button>
      {error ? (
        <p className="basis-full text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="basis-full text-sm text-pine-dark" role="status">
          {success}
        </p>
      ) : null}
      {!canInvite ? (
        <p className="basis-full text-xs text-ink-500">{labels.capMessage}</p>
      ) : null}
    </form>
  )
}
