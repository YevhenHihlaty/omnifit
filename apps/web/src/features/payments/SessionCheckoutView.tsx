"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { formatUsdFromCents } from "@omnifit/shared"
import { Button } from "@omnifit/ui"
import { ChevronLeft } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import { createSessionPaymentCheckout } from "@/features/payments/actions"
import type { CheckoutSessionView } from "@/features/payments/checkout-queries"

export type CheckoutLabels = {
  title: string
  subtitle: string
  back: string
  sessionPrice: string
  serviceFee: string
  totalDue: string
  payCta: string
  payPending: string
  cancel: string
  note: string
  unpaidPill: string
  failedPill: string
  canceledMessage: string
  withCoach: string
  errors: Record<string, string>
}

type SessionCheckoutViewProps = {
  session: CheckoutSessionView
  whenLabel: string
  canceled?: boolean
  labels: CheckoutLabels
}

export const SessionCheckoutView = ({
  session,
  whenLabel,
  canceled = false,
  labels,
}: SessionCheckoutViewProps) => {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(
    canceled ? labels.canceledMessage : null
  )

  const handlePay = () => {
    setError(null)
    startTransition(async () => {
      const result = await createSessionPaymentCheckout(session.sessionId)
      if (!result.success) {
        setError(labels.errors[result.error] ?? labels.errors.generic)
      }
    })
  }

  const showFailed = Boolean(error)

  return (
    <div className="mx-auto max-w-md">
      <Link
        href={ROUTES.clientCalendar}
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-plum-dark hover:underline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {labels.back}
      </Link>
      <h1 className="font-display text-[26px] font-bold text-ink-900">
        {labels.title}
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">{labels.subtitle}</p>

      <div className="mt-8 rounded-2xl border border-stone-300 bg-surface p-6">
        {showFailed ? (
          <span className="mb-3.5 inline-flex rounded-full bg-danger/10 px-3.5 py-1.5 text-xs font-semibold text-danger">
            {labels.failedPill}
          </span>
        ) : null}

        <div className="border-b border-stone-150 pb-4">
          <p className="font-display text-[15px] font-semibold text-ink-900">
            {session.title}
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {labels.withCoach.replace("{name}", session.coachName)}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-500">{whenLabel}</p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 text-[13.5px]">
          <div className="flex justify-between">
            <span className="text-ink-700">{labels.sessionPrice}</span>
            <span className="font-medium tabular-nums text-ink-900">
              {formatUsdFromCents(session.sessionPriceCents)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-700">{labels.serviceFee}</span>
            <span className="font-medium tabular-nums text-ink-900">
              {formatUsdFromCents(session.serviceFeeCents)}
            </span>
          </div>
        </div>

        <hr className="my-4 border-stone-300" />

        <div className="mb-5 flex items-baseline justify-between">
          <span className="text-sm font-bold text-ink-900">{labels.totalDue}</span>
          <span className="font-display text-[22px] font-bold tabular-nums text-pine-dark">
            {formatUsdFromCents(session.totalCents)}
          </span>
        </div>

        {error ? (
          <p
            className="mb-4 rounded-[10px] bg-danger/10 px-3.5 py-3 text-[12.5px] text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={handlePay}
          aria-label={labels.payCta.replace(
            "{amount}",
            formatUsdFromCents(session.totalCents)
          )}
        >
          {pending
            ? labels.payPending
            : labels.payCta.replace(
                "{amount}",
                formatUsdFromCents(session.totalCents)
              )}
        </Button>
        {pending ? (
          <p className="mt-2.5 text-center text-[11.5px] text-ink-500">
            {labels.note}
          </p>
        ) : (
          <Link
            href={ROUTES.clientCalendar}
            className="mt-2.5 inline-flex h-11 w-full items-center justify-center rounded-[10px] border-[1.5px] border-ink-900 text-[13.5px] font-semibold text-ink-900 hover:bg-stone-150"
          >
            {labels.cancel}
          </Link>
        )}
      </div>
    </div>
  )
}
