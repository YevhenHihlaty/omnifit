"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@omnifit/ui"
import { updateCredentials } from "./actions"
import type { CoachCredentialsSnapshot } from "./types"

export type CredentialsLabels = {
  title: string
  subtitle: string
  yearsLabel: string
  certificationsLabel: string
  educationLabel: string
  specialtiesLabel: string
  save: string
  saving: string
  saved: string
  errors: Record<string, string>
}

type CoachCredentialsPanelProps = {
  credentials: CoachCredentialsSnapshot
  labels: CredentialsLabels
}

export const CoachCredentialsPanel = ({
  credentials,
  labels,
}: CoachCredentialsPanelProps) => {
  const router = useRouter()
  const [form, setForm] = useState(credentials)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await updateCredentials(form)
      if (!result.success) {
        setError(labels.errors[result.error] ?? labels.errors.update_failed)
        return
      }
      setMessage(labels.saved)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="font-display text-lg font-semibold text-ink-900">
        {labels.title}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="cred-years">
            {labels.yearsLabel}
          </label>
          <input
            id="cred-years"
            value={form.yearsExperience}
            onChange={(e) =>
              setForm({ ...form, yearsExperience: e.target.value })
            }
            className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="cred-certs">
            {labels.certificationsLabel}
          </label>
          <textarea
            id="cred-certs"
            value={form.certifications}
            onChange={(e) =>
              setForm({ ...form, certifications: e.target.value })
            }
            rows={3}
            className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 px-3 py-2 text-sm focus:border-pine focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="cred-edu">
            {labels.educationLabel}
          </label>
          <textarea
            id="cred-edu"
            value={form.education}
            onChange={(e) => setForm({ ...form, education: e.target.value })}
            rows={3}
            className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 px-3 py-2 text-sm focus:border-pine focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="cred-spec">
            {labels.specialtiesLabel}
          </label>
          <textarea
            id="cred-spec"
            value={form.specialtiesText}
            onChange={(e) =>
              setForm({ ...form, specialtiesText: e.target.value })
            }
            rows={2}
            className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 px-3 py-2 text-sm focus:border-pine focus:outline-none"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-pine" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-5">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? labels.saving : labels.save}
        </Button>
      </div>
    </div>
  )
}
