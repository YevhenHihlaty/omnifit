"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { EmptyState, StatusPill } from "@omnifit/ui"
import { Mail, Send, X } from "lucide-react"
import { useLocale } from "@/lib/i18n/locale-store"
import { resendClientInvite } from "@/features/client-invite/resend-client-invite"
import { revokeClientInvite } from "@/features/client-invite/revoke-client-invite"
import type { PendingClientInvite } from "./queries"
import type { PendingInvitesListLabels } from "./labels"

type PendingInvitesListProps = {
  invites: PendingClientInvite[]
  labels: PendingInvitesListLabels
}

export const PendingInvitesList = ({
  invites,
  labels,
}: PendingInvitesListProps) => {
  const router = useRouter()
  const { locale } = useLocale()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const formatSent = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  const handleResend = (inviteId: string) => {
    setError(null)
    setStatus(null)
    setBusyId(inviteId)
    startTransition(async () => {
      const result = await resendClientInvite(inviteId)
      setBusyId(null)
      if (!result.success) {
        setError(labels.actionError)
        return
      }
      setStatus(labels.resendSuccess)
      router.refresh()
    })
  }

  const handleRevoke = (inviteId: string) => {
    setError(null)
    setStatus(null)
    setBusyId(inviteId)
    startTransition(async () => {
      const result = await revokeClientInvite(inviteId)
      setBusyId(null)
      if (!result.success) {
        setError(labels.actionError)
        return
      }
      setStatus(labels.revokeSuccess)
      router.refresh()
    })
  }

  const actionButtons = (inviteId: string, rowBusy: boolean) => (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-plum-dark hover:underline disabled:opacity-60"
        disabled={rowBusy}
        onClick={() => handleResend(inviteId)}
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        {rowBusy ? labels.resending : labels.resend}
      </button>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-danger hover:underline disabled:opacity-60"
        disabled={rowBusy}
        onClick={() => handleRevoke(inviteId)}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        {rowBusy ? labels.revoking : labels.revoke}
      </button>
    </div>
  )

  if (invites.length === 0) {
    return (
      <section className="mt-8" aria-labelledby="pending-invites-heading">
        <h2
          id="pending-invites-heading"
          className="font-display text-lg font-semibold text-ink-900"
        >
          {labels.title}
        </h2>
        <div className="mt-4">
          <EmptyState
            icon={<Mail className="h-8 w-8" />}
            title={labels.empty}
            description={labels.emptyHint}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8" aria-labelledby="pending-invites-heading">
      <h2
        id="pending-invites-heading"
        className="font-display text-lg font-semibold text-ink-900"
      >
        {labels.title}
      </h2>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mt-3 text-sm text-pine-dark" role="status">
          {status}
        </p>
      ) : null}

      {/* Mobile: stacked cards (design Mobile-PendingInvites) */}
      <ul className="mt-4 flex flex-col gap-2.5 sm:hidden">
        {invites.map((invite) => {
          const rowBusy = busyId === invite.id
          return (
            <li
              key={invite.id}
              className="flex flex-col gap-1.5 rounded-xl border border-stone-300 bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="break-all text-sm font-semibold text-ink-900">
                  {invite.email}
                </span>
                <StatusPill variant="pending" label={labels.pendingChip} />
              </div>
              <p className="text-[11px] text-ink-500">
                {labels.sent}{" "}
                <time dateTime={invite.createdAt}>{formatSent(invite.createdAt)}</time>
              </p>
              {actionButtons(invite.id, rowBusy)}
            </li>
          )
        })}
      </ul>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-hidden rounded-[14px] border border-stone-300 bg-surface sm:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-stone-300 bg-stone-150">
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                {labels.colEmail}
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                {labels.sent}
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                {labels.colStatus}
              </th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                <span className="sr-only">{labels.colActions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => {
              const rowBusy = busyId === invite.id
              return (
                <tr
                  key={invite.id}
                  className="border-b border-stone-150 last:border-b-0"
                >
                  <td className="px-5 py-4 text-sm font-medium text-ink-900 tabular-nums">
                    {invite.email}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-500">
                    <time dateTime={invite.createdAt}>
                      {formatSent(invite.createdAt)}
                    </time>
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill variant="pending" label={labels.pendingChip} />
                  </td>
                  <td className="px-5 py-4">{actionButtons(invite.id, rowBusy)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
