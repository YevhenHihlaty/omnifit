"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, EmptyState } from "@omnifit/ui"
import { Users, X } from "lucide-react"
import { useLocale } from "@/lib/i18n/locale-store"
import { clientLeaveCoach } from "./client-leave-coach"

import type { ClientCoachRow } from "./list-client-coaches"

type MyCoachesViewProps = {
  coaches: ClientCoachRow[]
  labels: {
    title: string
    subtitle: string
    emptyTitle: string
    emptyDescription: string
    leave: string
    leaving: string
    since: string
    leaveConfirm: string
    leaveConfirmTitle: string
    leaveConfirmCancel: string
    leaveFailed: string
  }
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export const MyCoachesView = ({ coaches, labels }: MyCoachesViewProps) => {
  const router = useRouter()
  const { locale } = useLocale()
  const titleId = useId()
  const descId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const leaveTriggers = useRef(new Map<string, HTMLButtonElement>())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingLeave, setPendingLeave] = useState<ClientCoachRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const formatSince = (iso: string) => {
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

  const handleCloseLeaveDialog = () => {
    const coachId = pendingLeave?.coachId
    setPendingLeave(null)
    if (coachId) {
      queueMicrotask(() => leaveTriggers.current.get(coachId)?.focus())
    }
  }

  useEffect(() => {
    if (!pendingLeave) return
    const node = dialogRef.current
    const focusable = node?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )
    focusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        const coachId = pendingLeave.coachId
        setPendingLeave(null)
        queueMicrotask(() => leaveTriggers.current.get(coachId)?.focus())
        return
      }
      if (event.key !== "Tab" || !node) return
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
      ).filter((el) => !el.hasAttribute("disabled"))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pendingLeave])

  const handleConfirmLeave = () => {
    if (!pendingLeave) return
    const coach = pendingLeave
    setPendingLeave(null)
    setError(null)
    setBusyId(coach.coachId)
    startTransition(async () => {
      const result = await clientLeaveCoach(coach.coachId)
      setBusyId(null)
      if (!result.success) {
        setError(labels.leaveFailed)
        leaveTriggers.current.get(coach.coachId)?.focus()
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-900">{labels.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {coaches.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={labels.emptyTitle}
            description={labels.emptyDescription}
          />
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {coaches.map((coach) => {
            const busy = busyId === coach.coachId
            return (
              <li
                key={coach.relationshipId}
                className="flex flex-col gap-3 rounded-[10px] border border-stone-300 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lilac font-display text-sm font-semibold text-ink-900"
                    aria-hidden
                  >
                    {initials(coach.displayName)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {coach.displayName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {labels.since}{" "}
                      <time dateTime={coach.since} className="tabular-nums">
                        {formatSince(coach.since)}
                      </time>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  ref={(node) => {
                    if (node) leaveTriggers.current.set(coach.coachId, node)
                    else leaveTriggers.current.delete(coach.coachId)
                  }}
                  onClick={() => setPendingLeave(coach)}
                  className="inline-flex min-h-11 items-center justify-center rounded-[10px] border-[1.5px] border-ink-900 bg-transparent px-4 text-sm font-medium text-ink-900 hover:bg-stone-150 disabled:pointer-events-none disabled:border-stone-300 disabled:bg-stone-150 disabled:text-ink-500"
                >
                  {busy ? labels.leaving : labels.leave}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {pendingLeave ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={handleCloseLeaveDialog}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={titleId} className="font-display text-lg font-semibold text-ink-900">
                {labels.leaveConfirmTitle}
              </h2>
              <button
                type="button"
                onClick={handleCloseLeaveDialog}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-ink-500 hover:bg-stone-150 hover:text-ink-900"
                aria-label={labels.leaveConfirmCancel}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p id={descId} className="text-sm text-ink-500">
              {labels.leaveConfirm.replace("{coach}", pendingLeave.displayName)}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={handleCloseLeaveDialog}>
                {labels.leaveConfirmCancel}
              </Button>
              <Button type="button" onClick={handleConfirmLeave}>
                {labels.leave}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
