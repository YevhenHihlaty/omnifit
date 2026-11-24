"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ACQUISITION_FEE_CENTS,
  PLATFORM_SERVICE_FEE_FREE_CENTS,
  PLATFORM_SERVICE_FEE_PRO_CENTS,
  formatUsdFromCents,
} from "@omnifit/shared"
import { Button, Toggle } from "@omnifit/ui"
import { ChevronRight } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import { signOut } from "@/features/auth/actions"
import {
  updateMarketplaceVisible,
  updateNotificationPrefs,
  updatePaymentCollection,
  updatePersonalOrg,
} from "./actions"
import { ConnectStripeButton } from "@/features/payments/ConnectStripeButton"
import type {
  CoachProfileHub,
  NotificationPrefs,
  PaymentCollection,
} from "./types"

export type SettingsLabels = {
  practiceTitle: string
  practiceName: string
  practiceSlug: string
  practiceSlugHint: string
  practiceHelp: string
  practiceSave: string
  currentPlanLabel: string
  manageBilling: string
  notificationsTitle: string
  notifyPush: string
  notifyEmail: string
  notifyBooking: string
  paymentTitle: string
  paymentSubtitle: string
  payInApp: string
  payInAppHint: string
  payDirect: string
  payDirectHint: string
  stripeRequired: string
  connectCta: string
  connectPending: string
  connectPendingHint: string
  connectErrors: Record<string, string>
  marketplaceTitle: string
  marketplaceLabel: string
  marketplaceHint: string
  marketplaceFlagOff: string
  feeTitle: string
  feeStripeHandles: string
  feeProcessing: string
  feeServiceFree: string
  feeServicePro: string
  feeAcquisition: string
  accountTitle: string
  billingLink: string
  helpLink: string
  signOut: string
  freePlan: string
  proPlan: string
  save: string
  saving: string
  saved: string
  errors: Record<string, string>
}

type CoachSettingsPanelProps = {
  hub: CoachProfileHub
  marketplaceFlagOn: boolean
  labels: SettingsLabels
}

export const CoachSettingsPanel = ({
  hub,
  marketplaceFlagOn,
  labels,
}: CoachSettingsPanelProps) => {
  const router = useRouter()
  const [orgName, setOrgName] = useState(hub.personalOrgName)
  const [orgSlug, setOrgSlug] = useState(hub.personalOrgSlug ?? "")
  const [payment, setPayment] = useState<PaymentCollection>(hub.paymentCollection)
  const [marketplace, setMarketplace] = useState(hub.marketplaceVisible)
  const [notifications, setNotifications] = useState<NotificationPrefs>(
    hub.notifications
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const hasConnect = hub.stripeConnectStatus === "ready"
  const connectPending = hub.stripeConnectStatus === "pending"
  const isPro = hub.tier === "pro"
  const freeFee = formatUsdFromCents(PLATFORM_SERVICE_FEE_FREE_CENTS)
  const proFee = formatUsdFromCents(PLATFORM_SERVICE_FEE_PRO_CENTS)
  const acquisition = formatUsdFromCents(ACQUISITION_FEE_CENTS)

  const resolveError = (code: string) =>
    labels.errors[code] ?? labels.errors.update_failed ?? code

  const handlePaymentChange = (next: PaymentCollection) => {
    setError(null)
    setMessage(null)
    if (next === "in_app" && !hasConnect) {
      setError(labels.stripeRequired)
      return
    }
    setPayment(next)
    startTransition(async () => {
      const result = await updatePaymentCollection(next)
      if (!result.success) {
        setPayment(hub.paymentCollection)
        setError(resolveError(result.error))
        return
      }
      setMessage(labels.saved)
      router.refresh()
    })
  }

  const handleMarketplace = (next: boolean) => {
    setMarketplace(next)
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await updateMarketplaceVisible(next)
      if (!result.success) {
        setMarketplace(hub.marketplaceVisible)
        setError(resolveError(result.error))
        return
      }
      setMessage(labels.saved)
      router.refresh()
    })
  }

  const handleOrgSave = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await updatePersonalOrg({ name: orgName, slug: orgSlug })
      if (!result.success) {
        setError(resolveError(result.error))
        return
      }
      setMessage(labels.saved)
      router.refresh()
    })
  }

  const handleNotify = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notifications, [key]: value }
    setNotifications(next)
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await updateNotificationPrefs(next)
      if (!result.success) {
        setNotifications(hub.notifications)
        setError(resolveError(result.error))
        return
      }
      setMessage(labels.saved)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-8">
      <section>
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-stone-300 bg-surface px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              {labels.currentPlanLabel}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-900">
              {isPro ? labels.proPlan : labels.freePlan}
            </p>
          </div>
          <Link
            href={ROUTES.billing}
            className="inline-flex min-h-11 items-center rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm font-semibold text-ink-900 hover:bg-stone-150"
          >
            {labels.manageBilling}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          {labels.notificationsTitle}
        </h2>
        <div className="mt-3 divide-y divide-stone-150">
          <div className="flex items-center justify-between py-3">
            <Toggle
              checked={notifications.push}
              onChange={(v) => handleNotify("push", v)}
              label={labels.notifyPush}
              disabled={pending}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <Toggle
              checked={notifications.emailDigest}
              onChange={(v) => handleNotify("emailDigest", v)}
              label={labels.notifyEmail}
              disabled={pending}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <Toggle
              checked={notifications.availableForBooking}
              onChange={(v) => handleNotify("availableForBooking", v)}
              label={labels.notifyBooking}
              disabled={pending}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          {labels.practiceTitle}
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium" htmlFor="org-name">
              {labels.practiceName}
            </label>
            <input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="org-slug">
              {labels.practiceSlug}
            </label>
            <div className="mt-1.5 flex min-h-11 overflow-hidden rounded-[10px] border-[1.5px] border-stone-300 focus-within:border-pine focus-within:shadow-[var(--of-focus-ring)]">
              <span className="flex items-center bg-stone-150 px-3 text-xs text-ink-500">
                app.omnifit.com/
              </span>
              <input
                id="org-slug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-surface px-3 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-ink-500">{labels.practiceSlugHint}</p>
          </div>
          <div className="rounded-[10px] border border-stone-300 bg-stone-150/50 px-3 py-3 text-xs text-ink-500">
            {labels.practiceHelp}
          </div>
          <Button type="button" onClick={handleOrgSave} disabled={pending}>
            {pending ? labels.saving : labels.practiceSave}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          {labels.paymentTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-500">{labels.paymentSubtitle}</p>
        <div className="mt-4 flex flex-col gap-3">
          {(
            [
              ["direct", labels.payDirect, labels.payDirectHint],
              ["in_app", labels.payInApp, labels.payInAppHint],
            ] as const
          ).map(([value, title, hint]) => {
            const selected = payment === value
            const disabled = value === "in_app" && !hasConnect
            return (
              <button
                key={value}
                type="button"
                disabled={pending || disabled}
                onClick={() => {
                  if (disabled) return
                  handlePaymentChange(value)
                }}
                className={`rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-colors ${
                  selected
                    ? "border-pine bg-pine-tint/40"
                    : "border-stone-300 bg-surface hover:border-pine"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                aria-pressed={selected}
                aria-disabled={disabled}
                title={disabled ? labels.stripeRequired : undefined}
              >
                <p className="text-sm font-semibold text-ink-900">{title}</p>
                <p className="mt-1 text-xs text-ink-500">{hint}</p>
              </button>
            )
          })}
        </div>
        {!hasConnect ? (
          <div className="mt-3">
            <ConnectStripeButton
              label={
                connectPending ? labels.connectPendingHint : labels.connectCta
              }
              pendingLabel={labels.connectPending}
              errorLabels={labels.connectErrors}
            />
            {connectPending ? (
              <p className="mt-1.5 text-xs text-ink-500">
                {labels.connectPendingHint}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          {labels.marketplaceTitle}
        </h2>
        <div className="mt-3">
          <Toggle
            checked={marketplace}
            onChange={handleMarketplace}
            label={labels.marketplaceLabel}
            disabled={pending}
          />
          <p className="mt-2 text-xs text-ink-500">
            {marketplaceFlagOn
              ? labels.marketplaceHint
              : labels.marketplaceFlagOff}
          </p>
        </div>
      </section>

      <section className="rounded-[12px] border border-stone-300 bg-surface p-4">
        <h2 className="font-display text-base font-semibold text-ink-900">
          {labels.feeTitle}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-700">
          <li>{labels.feeStripeHandles}</li>
          <li>{labels.feeProcessing}</li>
          <li>
            {labels.feeServiceFree.replace("{amount}", freeFee)} ·{" "}
            {labels.feeServicePro.replace("{amount}", proFee)}
          </li>
          <li>{labels.feeAcquisition.replace("{amount}", acquisition)}</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          {labels.accountTitle}
        </h2>
        <div className="mt-2 divide-y divide-stone-150 border-t border-stone-150">
          <Link
            href={ROUTES.billing}
            className="flex min-h-11 items-center justify-between py-3 text-sm font-medium text-ink-900"
          >
            {labels.billingLink}
            <ChevronRight className="h-4 w-4 text-ink-500" aria-hidden />
          </Link>
          <a
            href="mailto:support@omnifit.app"
            className="flex min-h-11 items-center justify-between py-3 text-sm font-medium text-ink-900"
          >
            {labels.helpLink}
            <ChevronRight className="h-4 w-4 text-ink-500" aria-hidden />
          </a>
        </div>
        <button
          type="button"
          className="mt-4 min-h-11 px-1 text-sm font-semibold text-danger hover:underline"
          onClick={() => {
            startTransition(async () => {
              await signOut()
            })
          }}
          disabled={pending}
        >
          {labels.signOut}
        </button>
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
