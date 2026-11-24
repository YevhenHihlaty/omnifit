"use client"

import { useActionState, useState } from "react"
import { Input, Button } from "@omnifit/ui"
import { signIn } from "@/features/auth/actions"
import type { ActionResult } from "@/features/auth/actions"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"

type LoginFormProps = {
  labels: {
    signIn: string
    signingIn: string
    email: string
    password: string
    forgotPassword: string
    noAccount: string
    register: string
    invalidCredentials: string
    showPassword: string
    hidePassword: string
  }
  next?: string
}

export const LoginForm = ({ labels, next }: LoginFormProps) => {
  const [state, action, isPending] = useActionState<ActionResult, FormData>(signIn, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="mt-8 flex flex-col gap-5" aria-label={labels.signIn} action={action}>
      {next && <input type="hidden" name="next" value={next} />}
      {state && "error" in state && (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {labels.invalidCredentials}
        </p>
      )}
      <Input label={labels.email} type="email" name="email" autoComplete="email" required />

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor="login-password" className="text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-500">
            {labels.password}
          </label>
          <Link href={ROUTES.forgotPassword} className="text-xs font-medium text-plum-dark hover:underline">
            {labels.forgotPassword}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            aria-label={labels.password}
            className="pr-12"
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-[10px] text-ink-500 hover:text-ink-900"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? labels.hidePassword : labels.showPassword}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <Button type="submit" className="mt-1 w-full bg-ink-900 hover:bg-ink-700" disabled={isPending}>
        {isPending ? labels.signingIn : labels.signIn}
      </Button>

      <p className="text-center text-sm text-ink-500">
        {labels.noAccount}{" "}
        <Link href={ROUTES.register} className="font-medium text-pine-dark hover:underline">
          {labels.register}
        </Link>
      </p>
    </form>
  )
}
