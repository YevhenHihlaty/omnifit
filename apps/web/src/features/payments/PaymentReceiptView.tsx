"use client"

import Link from "next/link"
import { formatUsdFromCents } from "@omnifit/shared"
import { CheckCircle2 } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import type { ReceiptView } from "@/features/payments/checkout-queries"

export type ReceiptLabels = {
  title: string
  clientHeading: string
  clientSub: string
  coachHeading: string
  coachSub: string
  offlineHeading: string
  offlineSub: string
  sessionPrice: string
  serviceFee: string
  totalCharged: string
  amountCollected: string
  paidOfflinePill: string
  stripeFee: string
  stripeFeeHint: string
  netPayout: string
  coachNote: string
  withCoach: string
  withClient: string
  backCalendar: string
  viewPayouts: string
  backSessions: string
}

type PaymentReceiptViewProps = {
  receipt: ReceiptView
  whenLabel: string
  labels: ReceiptLabels
}

const primaryLinkClass =
  "inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-pine text-sm font-semibold text-surface transition-colors hover:bg-pine-dark focus-visible:outline-none focus-visible:shadow-[var(--of-focus-ring)]"

const secondaryLinkClass =
  "inline-flex h-11 w-full items-center justify-center rounded-[10px] border-[1.5px] border-ink-900 bg-transparent text-sm font-semibold text-ink-900 transition-colors hover:bg-stone-150 focus-visible:outline-none focus-visible:shadow-[var(--of-focus-ring)]"

export const PaymentReceiptView = ({
  receipt,
  whenLabel,
  labels,
}: PaymentReceiptViewProps) => {
  const isClient = receipt.role === "client"
  const offline = receipt.paidOffline

  const heading = offline
    ? labels.offlineHeading
    : isClient
      ? labels.clientHeading
      : labels.coachHeading
  const sub = offline
    ? labels.offlineSub
    : isClient
      ? labels.clientSub
      : labels.coachSub

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-bold text-ink-900">
        {labels.title}
      </h1>

      <div className="mt-6 rounded-2xl border border-stone-300 bg-surface p-7">
        <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-pine-tint text-pine-dark">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="font-display text-lg font-bold text-ink-900">{heading}</h2>
        <p className="mt-1 text-sm text-ink-500">{sub}</p>

        {offline ? (
          <span className="mt-3 inline-flex rounded-full bg-stone-150 px-3 py-1 text-xs font-semibold text-ink-700">
            {labels.paidOfflinePill}
          </span>
        ) : null}

        <div className="my-5 border-y border-stone-150 py-4">
          <p className="font-display text-[14.5px] font-semibold text-ink-900">
            {receipt.title}
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {isClient
              ? labels.withCoach.replace("{name}", receipt.counterpartName)
              : labels.withClient.replace("{name}", receipt.counterpartName)}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-500">{whenLabel}</p>
        </div>

        {offline ? (
          <>
            <div className="flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-ink-700">{labels.sessionPrice}</span>
                <span className="font-medium tabular-nums">
                  {formatUsdFromCents(receipt.sessionPriceCents)}
                </span>
              </div>
            </div>
            <hr className="my-4 border-stone-300" />
            <div className="mb-5 flex items-baseline justify-between">
              <span className="text-sm font-bold">{labels.amountCollected}</span>
              <span className="font-display text-xl font-bold tabular-nums text-pine-dark">
                {formatUsdFromCents(receipt.sessionPriceCents)}
              </span>
            </div>
            <Link
              href={isClient ? ROUTES.clientCalendar : ROUTES.sessions}
              className={primaryLinkClass}
            >
              {isClient ? labels.backCalendar : labels.backSessions}
            </Link>
          </>
        ) : isClient ? (
          <>
            <div className="flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-ink-700">{labels.sessionPrice}</span>
                <span className="font-medium tabular-nums">
                  {formatUsdFromCents(receipt.sessionPriceCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-700">{labels.serviceFee}</span>
                <span className="font-medium tabular-nums">
                  {formatUsdFromCents(receipt.serviceFeeCents)}
                </span>
              </div>
            </div>
            <hr className="my-4 border-stone-300" />
            <div className="mb-5 flex items-baseline justify-between">
              <span className="text-sm font-bold">{labels.totalCharged}</span>
              <span className="font-display text-xl font-bold tabular-nums text-pine-dark">
                {formatUsdFromCents(receipt.totalCents)}
              </span>
            </div>
            <Link href={ROUTES.clientCalendar} className={primaryLinkClass}>
              {labels.backCalendar}
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-ink-700">{labels.sessionPrice}</span>
                <span className="font-medium tabular-nums">
                  {formatUsdFromCents(receipt.sessionPriceCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-700">
                  {labels.stripeFee}
                  <small className="mt-0.5 block text-[11px] font-normal text-ink-500">
                    {labels.stripeFeeHint}
                  </small>
                </span>
                <span className="font-medium tabular-nums text-danger">
                  −{formatUsdFromCents(receipt.stripeFeeCents)}
                </span>
              </div>
            </div>
            <hr className="my-4 border-stone-300" />
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-bold">{labels.netPayout}</span>
              <span className="font-display text-xl font-bold tabular-nums text-plum-dark">
                {formatUsdFromCents(receipt.netPayoutCents)}
              </span>
            </div>
            <p className="mb-5 text-[11px] leading-relaxed text-ink-500">
              {labels.coachNote.replace(
                "{fee}",
                formatUsdFromCents(receipt.serviceFeeCents)
              )}
            </p>
            <Link href={ROUTES.billing} className={secondaryLinkClass}>
              {labels.viewPayouts}
            </Link>
            <Link
              href={ROUTES.sessions}
              className="mt-2.5 flex min-h-11 items-center justify-center text-[13.5px] font-semibold text-plum-dark hover:underline"
            >
              {labels.backSessions}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
