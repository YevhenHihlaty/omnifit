"use client"

import Link from "next/link"
import { Button, EmptyState, StatusPill } from "@omnifit/ui"
import { formatUsdFromCents } from "@omnifit/shared"
import { Check, FileText, Link2 } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import type { CoachRosterUsage } from "@/features/client-invite/queries"
import type { AcquisitionInvoiceRow } from "@/features/payments/queries"
import type { StripeConnectStatus } from "@/features/payments/checkout-queries"
import { ConnectStripeButton } from "@/features/payments/ConnectStripeButton"

export type BillingLabels = {
  title: string
  subtitle: string
  sectionPlan: string
  sectionPayouts: string
  sectionAcquisition: string
  acquisitionEmptyTitle: string
  acquisitionEmpty: string
  acquisitionBlocked: string
  acquisitionPayCta: string
  acquisitionStatus: Record<string, string>
  freeName: string
  freeDesc: string
  freeFeat1: string
  freeFeat2: string
  freeFeat3: string
  currentPlanCta: string
  currentBadge: string
  usageLabel: string
  usageOf: string
  proName: string
  proPrice: string
  proPriceSuffix: string
  proDesc: string
  proFeat1: string
  proFeat2: string
  proFeat3: string
  proFeat3Soon: string
  upgradeCta: string
  upgradeDisabled: string
  proActiveTitle: string
  proActiveSubtitle: string
  manageBillingSoon: string
  payoutConnectedTitle: string
  payoutConnectedBody: string
  payoutPendingTitle: string
  payoutPendingBody: string
  payoutVerifyingTitle: string
  payoutVerifyingBody: string
  connectedBadge: string
  notConnectedBadge: string
  verifyingBadge: string
  connectCta: string
  connectPending: string
  connectFinishCta: string
  connectErrors: Record<string, string>
  viewHistorySoon: string
  backToSettings: string
}

type SubscriptionBillingViewProps = {
  usage: CoachRosterUsage | null
  connectStatus: StripeConnectStatus
  acquisitionInvoices: AcquisitionInvoiceRow[]
  acquisitionBlocked: boolean
  loadFailed: boolean
  loadFailedLabel: string
  labels: BillingLabels
}

const acquisitionPillVariant = (
  status: string
): "active" | "danger" | "pending" | "inactive" => {
  if (status === "paid") return "active"
  if (status === "open" || status === "uncollectible") return "danger"
  if (status === "draft") return "pending"
  return "inactive"
}

export const SubscriptionBillingView = ({
  usage,
  connectStatus,
  acquisitionInvoices,
  acquisitionBlocked,
  loadFailed,
  loadFailedLabel,
  labels,
}: SubscriptionBillingViewProps) => {
  const tier = usage?.tier ?? "free"
  const isPro = tier === "pro"
  const active = usage?.activeCount ?? 0
  const limit = usage?.limit
  const hasFiniteLimit = typeof limit === "number" && Number.isFinite(limit)
  const connectReady = connectStatus === "ready"
  const connectPending = connectStatus === "pending"

  const acquisitionStatusLabel = (status: string) =>
    labels.acquisitionStatus[status] ?? status

  const payoutTitle = connectReady
    ? labels.payoutConnectedTitle
    : connectPending
      ? labels.payoutVerifyingTitle
      : labels.payoutPendingTitle
  const payoutBody = connectReady
    ? labels.payoutConnectedBody
    : connectPending
      ? labels.payoutVerifyingBody
      : labels.payoutPendingBody
  const payoutBadge = connectReady
    ? labels.connectedBadge
    : connectPending
      ? labels.verifyingBadge
      : labels.notConnectedBadge
  const payoutVariant = connectReady
    ? ("active" as const)
    : connectPending
      ? ("pending" as const)
      : ("inactive" as const)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[28px] font-bold text-ink-900">
        {labels.title}
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">{labels.subtitle}</p>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {loadFailedLabel}
        </p>
      ) : null}

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {labels.sectionPlan}
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div
          className={`rounded-[16px] border-[1.5px] bg-surface p-[26px] ${
            !isPro
              ? "border-pine shadow-[0_0_0_1px_var(--of-pine)]"
              : "border-stone-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xl font-bold text-ink-900">
              {labels.freeName}
            </span>
            {!isPro ? (
              <StatusPill label={labels.currentBadge} variant="active" />
            ) : null}
          </div>
          <p className="mt-2 text-sm text-ink-500">{labels.freeDesc}</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-700">
            {[labels.freeFeat1, labels.freeFeat2, labels.freeFeat3].map(
              (feat) => (
                <li key={feat} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-pine"
                    aria-hidden
                  />
                  {feat}
                </li>
              )
            )}
          </ul>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full"
            disabled
          >
            {labels.currentPlanCta}
          </Button>
          {!isPro && hasFiniteLimit ? (
            <div className="mt-3.5 flex justify-between text-xs text-ink-500">
              <span>{labels.usageLabel}</span>
              <span className="font-semibold tabular-nums text-ink-900">
                {labels.usageOf
                  .replace("{used}", String(active))
                  .replace("{limit}", String(limit))}
              </span>
            </div>
          ) : null}
        </div>

        <div
          className={`rounded-[16px] border-[1.5px] bg-surface p-[26px] ${
            isPro
              ? "border-pine shadow-[0_0_0_1px_var(--of-pine)]"
              : "border-stone-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xl font-bold text-ink-900">
              {labels.proName}
            </span>
            {isPro ? (
              <StatusPill label={labels.currentBadge} variant="active" />
            ) : null}
          </div>
          <p className="mt-2 font-display text-[28px] font-bold tabular-nums text-ink-900">
            {labels.proPrice}
            <span className="text-sm font-medium text-ink-500">
              {labels.proPriceSuffix}
            </span>
          </p>
          <p className="mt-2 text-sm text-ink-500">{labels.proDesc}</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-700">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden />
              {labels.proFeat1}
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden />
              {labels.proFeat2}
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden />
              <span>
                {labels.proFeat3}{" "}
                <span className="rounded-full bg-stone-150 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  {labels.proFeat3Soon}
                </span>
              </span>
            </li>
          </ul>
          {!isPro ? (
            <div className="mt-5">
              <button
                type="button"
                disabled
                className="h-11 w-full cursor-not-allowed rounded-[10px] bg-stone-150 text-sm font-semibold text-ink-500"
                title={labels.upgradeDisabled}
              >
                {labels.upgradeCta}
              </button>
              <p className="mt-1.5 text-xs text-ink-500">
                {labels.upgradeDisabled}
              </p>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="mt-5 w-full"
              disabled
            >
              {labels.currentPlanCta}
            </Button>
          )}
        </div>
      </div>

      {isPro ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-stone-300 bg-surface px-5 py-4">
          <div>
            <p className="font-semibold text-ink-900">{labels.proActiveTitle}</p>
            <p className="mt-0.5 text-sm text-ink-500">
              {labels.proActiveSubtitle}
            </p>
          </div>
          <p className="text-sm font-semibold text-ink-500">
            {labels.manageBillingSoon}
          </p>
        </div>
      ) : null}

      <p className="mt-10 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {labels.sectionPayouts}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-[14px] border border-stone-300 bg-surface px-5 py-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[12px] bg-sky text-ink-700">
          <Link2 className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{payoutTitle}</p>
          <p className="mt-0.5 text-sm text-ink-500">{payoutBody}</p>
        </div>
        <StatusPill label={payoutBadge} variant={payoutVariant} />
        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:flex-col sm:items-end">
          {connectReady ? (
            <p className="text-sm font-semibold text-ink-500">
              {labels.viewHistorySoon}
            </p>
          ) : (
            <ConnectStripeButton
              label={
                connectPending ? labels.connectFinishCta : labels.connectCta
              }
              pendingLabel={labels.connectPending}
              errorLabels={labels.connectErrors}
            />
          )}
        </div>
      </div>

      <p className="mt-10 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {labels.sectionAcquisition}
      </p>
      {acquisitionBlocked ? (
        <p
          className="mt-3 rounded-[12px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {labels.acquisitionBlocked}
        </p>
      ) : null}
      {acquisitionInvoices.length === 0 ? (
        <div className="mt-3 max-w-sm">
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title={labels.acquisitionEmptyTitle}
            description={labels.acquisitionEmpty}
          />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {acquisitionInvoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-stone-300 bg-surface px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{inv.clientName}</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {formatUsdFromCents(inv.amountCents)}
                </p>
              </div>
              <StatusPill
                label={acquisitionStatusLabel(inv.status)}
                variant={acquisitionPillVariant(inv.status)}
              />
              {inv.hostedUrl && inv.status !== "paid" ? (
                <a
                  href={inv.hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-pine hover:underline"
                >
                  {labels.acquisitionPayCta}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={ROUTES.profileSettings}
        className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-pine hover:underline"
      >
        {labels.backToSettings}
      </Link>
    </div>
  )
}
