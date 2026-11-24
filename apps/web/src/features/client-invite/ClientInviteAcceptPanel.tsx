"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button, Input } from "@omnifit/ui"
import { ROUTES } from "@/lib/routes"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import { completeClientInvite } from "./complete-client-invite"
import { acceptClientInviteLoggedIn } from "./accept-client-invite-logged-in"
import { resolveInviteErrorMessage } from "./map-invite-error"
import { signOut } from "@/features/auth/actions"
import type { ClientInviteAcceptLabels } from "./labels"
import type { ClientInviteAcceptMode, OtherCoachSummary } from "./client-invite-preview"

type ClientInviteAcceptPanelProps = {
  token: string
  coachName: string
  inviteEmail: string
  acceptMode: ClientInviteAcceptMode
  sharedLogDisclosure: boolean
  otherCoaches: OtherCoachSummary[]
  isAuthenticated: boolean
  signedInRole: "coach" | "client" | null
  emailMatches: boolean
  labels: ClientInviteAcceptLabels
  variant: "ready" | "already_accepted"
  authEmailLabel: string
  authShowPassword: string
  authHidePassword: string
}

const coachInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export const ClientInviteAcceptPanel = ({
  token,
  coachName,
  inviteEmail,
  acceptMode,
  sharedLogDisclosure,
  otherCoaches,
  isAuthenticated,
  signedInRole,
  emailMatches,
  labels,
  variant,
  authEmailLabel,
  authShowPassword,
  authHidePassword,
}: ClientInviteAcceptPanelProps) => {
  const { locale } = useLocale()
  const t = (key: string) => translate(locale, key)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [disclosureConfirmed, setDisclosureConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newUserStep, setNewUserStep] = useState<"preview" | "password">("preview")
  const [isPending, startTransition] = useTransition()

  const loginNext = `${ROUTES.inviteClientBase}/${encodeURIComponent(token)}`
  const displayError = (code: string) => resolveInviteErrorMessage(code, t)

  const handleNewUserSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!termsAccepted) {
      setError(labels.termsRequired)
      return
    }

    startTransition(async () => {
      const result = await completeClientInvite({
        token,
        password,
        confirmPassword,
      })

      if (result && !result.success) {
        setError(displayError(result.error))
      }
    })
  }

  const handleLoggedInAccept = () => {
    setError(null)

    startTransition(async () => {
      const result = await acceptClientInviteLoggedIn({
        token,
        disclosureConfirmed: sharedLogDisclosure ? disclosureConfirmed : true,
      })

      if (result && !result.success) {
        setError(displayError(result.error))
      }
    })
  }

  const previewHeader = (
    <div className="space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-plum-dark">
        {labels.previewEyebrow}
      </p>
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage font-display text-lg font-bold text-pine-dark"
          aria-hidden
        >
          {coachInitials(coachName)}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">{coachName}</p>
          <p className="text-[12.5px] text-ink-500">{labels.coachRoleLine}</p>
        </div>
      </div>
    </div>
  )

  const inviteCallout = inviteEmail ? (
    <div className="rounded-[10px] bg-stone-150 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-700">
      {labels.inviteSentTo.replace("{email}", inviteEmail)}
    </div>
  ) : null

  if (variant === "already_accepted") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
        {previewHeader}
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            {labels.title.replace("{coach}", coachName)}
          </h1>
          <p className="text-sm text-ink-500">{labels.continueOnboarding}</p>
        </div>
        <Link
          href={ROUTES.clientHome}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[10px] bg-pine px-4 text-sm font-medium text-surface hover:bg-pine-dark"
        >
          {labels.openHome}
        </Link>
      </div>
    )
  }

  if (signedInRole === "coach") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
        <h1 className="font-display text-xl font-semibold text-ink-900">
          {labels.coachRejectedTitle}
        </h1>
        <p className="text-sm text-ink-500">{labels.coachRejectedBody}</p>
        <div className="flex flex-col gap-2">
          <Link
            href={ROUTES.dashboard}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-pine px-4 text-sm font-medium text-surface hover:bg-pine-dark"
          >
            {labels.coachGoDashboard}
          </Link>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              startTransition(async () => {
                await signOut()
              })
            }}
          >
            {labels.coachSignOut}
          </Button>
        </div>
      </div>
    )
  }

  if (isAuthenticated && emailMatches && acceptMode === "existing_client") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
        {previewHeader}
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            {labels.title.replace("{coach}", coachName)}
          </h1>
          <p className="text-sm text-ink-500">{labels.subtitleExistingClient}</p>
        </div>
        {inviteCallout}

        {sharedLogDisclosure ? (
          <div className="rounded-[10px] border border-stone-300 bg-cream p-4">
            <h2 className="text-sm font-semibold text-ink-900">
              {labels.disclosureTitle}
            </h2>
            <p className="mt-2 text-sm text-ink-500">{labels.disclosureBody}</p>
            {otherCoaches.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  {labels.otherCoachesHeading}
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-700">
                  {otherCoaches.map((coach) => (
                    <li key={coach.coachId}>{coach.displayName}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink-700">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-pine"
                checked={disclosureConfirmed}
                onChange={(event) => setDisclosureConfirmed(event.target.checked)}
              />
              <span className="pt-0.5">{labels.disclosureConfirm}</span>
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={isPending || (sharedLogDisclosure && !disclosureConfirmed)}
          onClick={handleLoggedInAccept}
          className="w-full min-h-[46px]"
        >
          {isPending ? labels.acceptLoading : labels.acceptCta}
        </Button>
      </div>
    )
  }

  if (isAuthenticated && !emailMatches) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
        <p className="text-sm text-danger" role="alert">
          {labels.emailMismatch.replace("{email}", inviteEmail)}
        </p>
        <Link
          href={`${ROUTES.login}?next=${encodeURIComponent(loginNext)}`}
          className="text-sm font-medium text-plum-dark underline-offset-4 hover:underline"
        >
          {labels.signInCta}
        </Link>
      </div>
    )
  }

  if (acceptMode === "existing_client" && !isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
        {previewHeader}
        <div className="space-y-2">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            {labels.title.replace("{coach}", coachName)}
          </h1>
          <p className="text-sm text-ink-500">{labels.subtitleExistingClient}</p>
        </div>
        {inviteCallout}
        <Link
          href={`${ROUTES.login}?next=${encodeURIComponent(loginNext)}`}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[10px] bg-pine px-4 text-sm font-medium text-surface hover:bg-pine-dark"
        >
          {labels.signInCta}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      {newUserStep === "preview" ? (
        <>
          {previewHeader}
          <div className="space-y-2">
            <h1 className="font-display text-xl font-semibold text-ink-900">
              {labels.title.replace("{coach}", coachName)}
            </h1>
            <p className="text-sm text-ink-500">{labels.subtitleNewUser}</p>
          </div>
          {inviteCallout}
          <Button
            type="button"
            className="w-full min-h-[46px]"
            onClick={() => setNewUserStep("password")}
          >
            {labels.acceptCta}
          </Button>
          <p className="text-center text-sm text-ink-500">
            {labels.signInHint}{" "}
            <Link
              href={`${ROUTES.login}?next=${encodeURIComponent(loginNext)}`}
              className="font-semibold text-plum-dark underline-offset-4 hover:underline"
            >
              {labels.signInCta}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider text-plum-dark">
            {labels.passwordEyebrow}
          </p>
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage font-display text-lg font-bold text-pine-dark"
              aria-hidden
            >
              {coachInitials(coachName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">{coachName}</p>
              <p className="text-[12.5px] text-ink-500">{labels.coachRoleLine}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-xl font-semibold text-ink-900">
              {labels.title.replace("{coach}", coachName)}
            </h1>
            <p className="text-sm text-ink-500">{labels.subtitleNewUser}</p>
          </div>
          {inviteCallout}

          <form onSubmit={handleNewUserSubmit} className="flex flex-col gap-4">
            <Input
              label={authEmailLabel}
              type="email"
              value={inviteEmail}
              readOnly
              className="bg-stone-150"
            />
            <div>
              <label htmlFor="invite-password" className="mb-1.5 block text-sm font-medium text-ink-700">
                {labels.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="invite-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 pr-12 text-sm text-ink-900 focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-[10px] text-ink-500 hover:text-ink-900"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? authHidePassword : authShowPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-500">{labels.passwordHint}</p>
            </div>
            <Input
              label={labels.confirmPasswordLabel}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-ink-700">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-pine"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                required
              />
              <span>
                {labels.termsAgree.split("{terms}")[0]}
                <Link
                  href={ROUTES.terms}
                  className="font-semibold text-plum-dark underline-offset-2 hover:underline"
                >
                  {labels.termsLink}
                </Link>
                {(labels.termsAgree.split("{terms}")[1] ?? "").split("{privacy}")[0]}
                <Link
                  href={ROUTES.privacy}
                  className="font-semibold text-plum-dark underline-offset-2 hover:underline"
                >
                  {labels.privacyLink}
                </Link>
                {(labels.termsAgree.split("{privacy}")[1] ?? "")}
              </span>
            </label>

            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isPending || !termsAccepted} className="w-full min-h-[46px]">
              {isPending ? labels.submitLoading : labels.submitCta}
            </Button>
          </form>

          <button
            type="button"
            className="text-sm font-medium text-plum-dark underline-offset-4 hover:underline"
            onClick={() => setNewUserStep("preview")}
          >
            ← {labels.previewEyebrow}
          </button>
        </>
      )}
    </div>
  )
}
