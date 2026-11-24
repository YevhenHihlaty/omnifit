"use client"

import { useTransition, useState } from "react"
import { Input, Button } from "@omnifit/ui"
import { signUpCoach } from "@/features/auth/actions"
import type { ActionResult } from "@/features/auth/actions"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"

type RegisterFormProps = {
  labels: {
    createAccount: string
    creating: string
    email: string
    password: string
    confirmPassword: string
    passwordStrength: string
    strengthWeak: string
    strengthFair: string
    strengthStrong: string
    displayName: string
    phone: string
    phoneHint: string
    phonePlaceholder: string
    haveAccount: string
    signIn: string
    signupError: string
    termsPrefix: string
    termsLink: string
    and: string
    privacyLink: string
    termsRequired: string
    startFreeTrial: string
  }
}

const passwordStrength = (password: string): 0 | 1 | 2 | 3 => {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1
  return score as 0 | 1 | 2 | 3
}

export const RegisterForm = ({ labels }: RegisterFormProps) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const strength = passwordStrength(password)
  const strengthLabel =
    strength <= 1 ? labels.strengthWeak : strength === 2 ? labels.strengthFair : labels.strengthStrong

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result: ActionResult = await signUpCoach(formData)
      if (result && "error" in result) {
        setError(result.error === "auth.termsRequired" ? labels.termsRequired : labels.signupError)
      }
    })
  }

  return (
    <form className="mt-8 flex flex-col gap-5" aria-label={labels.createAccount} onSubmit={handleSubmit}>
      {error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Input label={labels.displayName} type="text" name="displayName" autoComplete="name" required maxLength={80} />
      <Input label={labels.email} type="email" name="email" autoComplete="email" required />
      <div>
        <Input
          label={labels.password}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="mt-2" aria-live="polite">
          <p className="sr-only">
            {labels.passwordStrength}: {strengthLabel}
          </p>
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  strength >= n
                    ? strength === 1
                      ? "bg-danger"
                      : strength === 2
                        ? "bg-warning"
                        : "bg-pine"
                    : "bg-stone-300"
                }`}
              />
            ))}
          </div>
          {password.length > 0 && (
            <p className="mt-1 text-xs text-ink-500">
              {labels.passwordStrength}: {strengthLabel}
            </p>
          )}
        </div>
      </div>
      <Input
        label={labels.confirmPassword}
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <div>
        <Input
          label={labels.phone}
          type="tel"
          name="phone"
          autoComplete="tel"
          placeholder={labels.phonePlaceholder}
          required
          aria-describedby="phone-hint"
        />
        <p id="phone-hint" className="mt-1 text-xs text-ink-500">
          {labels.phoneHint}
        </p>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink-700">
        <input
          type="checkbox"
          name="terms"
          defaultChecked
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-pine"
        />
        <span>
          {labels.termsPrefix}{" "}
          <Link href={ROUTES.terms} className="font-semibold text-pine-dark hover:underline">
            {labels.termsLink}
          </Link>{" "}
          {labels.and}{" "}
          <Link href={ROUTES.privacy} className="font-semibold text-pine-dark hover:underline">
            {labels.privacyLink}
          </Link>
          .
        </span>
      </label>

      <Button type="submit" className="mt-1 w-full bg-ink-900 hover:bg-ink-700" disabled={isPending}>
        {isPending ? labels.creating : labels.startFreeTrial}
      </Button>

      <p className="text-center text-sm text-ink-500">
        {labels.haveAccount}{" "}
        <Link href={ROUTES.login} className="font-medium text-pine-dark hover:underline">
          {labels.signIn}
        </Link>
      </p>
    </form>
  )
}
