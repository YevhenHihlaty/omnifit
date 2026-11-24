"use client"

import { useEffect, useId, useState, useTransition } from "react"
import { UserPlus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@omnifit/ui"
import { inviteClientByEmail } from "@/features/client-invite/invite-client-by-email"
import { resolveInviteErrorMessage } from "@/features/client-invite/map-invite-error"
import type { ClientInviteDialogLabels } from "./labels"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"

type InviteClientDialogProps = {
  canInvite: boolean
  labels: ClientInviteDialogLabels
}

export const InviteClientDialog = ({
  canInvite,
  labels,
}: InviteClientDialogProps) => {
  const router = useRouter()
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const titleId = useId()
  const descId = useId()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleClose = () => {
    setOpen(false)
    setEmail("")
    setError(null)
    setSuccess(null)
  }

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
    <>
      <Button
        type="button"
        onClick={() => canInvite && setOpen(true)}
        disabled={!canInvite}
        title={!canInvite ? labels.capMessage : undefined}
        className="inline-flex min-h-11 gap-2"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        {labels.inviteCta}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="font-display text-lg font-semibold text-ink-900">
                  {labels.dialogTitle}
                </h2>
                <p id={descId} className="mt-1 text-sm text-ink-500">
                  {labels.dialogSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-ink-500 hover:bg-stone-150 hover:text-ink-900"
                aria-label={labels.cancelCta}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label={labels.emailLabel}
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="text-sm text-pine-dark" role="status">
                  {success}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  {labels.cancelCta}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? labels.sendingCta : labels.sendCta}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
