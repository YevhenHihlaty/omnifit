"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@omnifit/ui"
import { LOCALES, type Locale } from "@/lib/i18n/constants"
import { setClientLocale } from "@/lib/i18n/locale-store"
import { anonymizeOwnAccount, updatePreferredLocale } from "./actions"

export type ClientAccountLabels = {
  localeTitle: string
  localeSubtitle: string
  localeLabel: string
  localeSave: string
  saving: string
  saved: string
  dangerTitle: string
  dangerBody: string
  deleteCta: string
  deleteConfirm: string
  deleteCancel: string
  deleting: string
  langEn: string
  langPl: string
  langUk: string
  errors: Record<string, string>
}

type ClientAccountSettingsProps = {
  currentLocale: Locale
  labels: ClientAccountLabels
}

export const ClientAccountSettings = ({
  currentLocale,
  labels,
}: ClientAccountSettingsProps) => {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>(currentLocale)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const localeLabel = (code: Locale) => {
    if (code === "pl") return labels.langPl
    if (code === "uk") return labels.langUk
    return labels.langEn
  }

  const handleLocaleSave = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await updatePreferredLocale(locale)
      if (!result.success) {
        setError(labels.errors[result.error] ?? labels.errors.update_failed)
        return
      }
      setMessage(labels.saved)
      setClientLocale(locale)
    })
  }

  const handleAnonymize = () => {
    setError(null)
    startTransition(async () => {
      const result = await anonymizeOwnAccount()
      if (!result.success) {
        setError(labels.errors[result.error] ?? labels.errors.anonymize_failed)
        setConfirmOpen(false)
        return
      }
      router.replace("/login")
    })
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section className="rounded-[12px] border border-stone-300 bg-surface p-5">
        <h2 className="font-display text-base font-semibold text-ink-900">
          {labels.localeTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{labels.localeSubtitle}</p>
        <label className="mt-4 block text-sm font-medium" htmlFor="pref-locale">
          {labels.localeLabel}
        </label>
        <select
          id="pref-locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="mt-1.5 w-full max-w-xs min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {localeLabel(code)}
            </option>
          ))}
        </select>
        <div className="mt-4">
          <Button type="button" onClick={handleLocaleSave} disabled={pending}>
            {pending ? labels.saving : labels.localeSave}
          </Button>
        </div>
      </section>

      <section className="rounded-[12px] border border-danger/30 bg-surface p-5">
        <h2 className="font-display text-base font-semibold text-danger">
          {labels.dangerTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{labels.dangerBody}</p>
        {!confirmOpen ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              {labels.deleteCta}
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleAnonymize}
              disabled={pending}
            >
              {pending ? labels.deleting : labels.deleteConfirm}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              {labels.deleteCancel}
            </Button>
          </div>
        )}
      </section>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-pine" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
