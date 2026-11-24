"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { resendVerificationEmail } from "@/features/auth/actions"

type Props = {
  email: string
  labels: {
    checkYourEmail: string
    verifyEmailSent: string
    verifyEmailInstructions: string
    openEmailApp: string
    resendEmail: string
    resendSent: string
    wrongEmail: string
    goBackEdit: string
  }
}

export const VerifyEmailView = ({ email, labels }: Props) => {
  const [pending, startTransition] = useTransition()
  const [resent, setResent] = useState(false)

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <div
        className="mx-auto mb-6 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-sage text-pine-dark"
        aria-hidden
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>

      <h1 className="font-display text-3xl font-bold text-ink-900">{labels.checkYourEmail}</h1>
      <p className="mt-4 text-sm text-ink-500">{labels.verifyEmailSent}</p>
      {email && <p className="mt-1 font-medium text-ink-900">{email}</p>}
      <p className="mt-3 text-sm text-ink-500">{labels.verifyEmailInstructions}</p>

      <a
        href="mailto:"
        className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-pine px-4 text-sm font-semibold text-surface transition-colors hover:bg-pine-dark"
      >
        {labels.openEmailApp}
      </a>

      {email && (
        <button
          type="button"
          disabled={pending}
          className="mt-4 text-sm font-medium text-plum-dark hover:underline disabled:opacity-50"
          onClick={() => {
            startTransition(async () => {
              await resendVerificationEmail(email)
              setResent(true)
            })
          }}
        >
          {resent ? labels.resendSent : labels.resendEmail}
        </button>
      )}

      <p className="mt-8 text-sm text-ink-500">
        {labels.wrongEmail}{" "}
        <Link href={ROUTES.register} className="font-medium text-pine-dark hover:underline">
          {labels.goBackEdit}
        </Link>
      </p>
    </div>
  )
}
