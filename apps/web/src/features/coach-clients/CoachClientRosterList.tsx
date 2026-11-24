"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Avatar, EmptyState, StatusPill } from "@omnifit/ui"
import { Users, Search } from "lucide-react"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import { buildActivitySubtitle, BUCKET_VARIANTS } from "./client-status"
import type { CoachClientRow } from "./types"
import type { CoachClientsLabels } from "./labels"

type CoachClientRosterListProps = {
  clients: CoachClientRow[]
  labels: CoachClientsLabels
  selectedClientId?: string | null
  onSelect: (clientId: string) => void
  statusFilter?: "active" | "archived"
  attentionOnly?: boolean
}

export const CoachClientRosterList = ({
  clients,
  labels,
  selectedClientId,
  onSelect,
  statusFilter = "active",
  attentionOnly = false,
}: CoachClientRosterListProps) => {
  const { locale } = useLocale()
  const t = (key: string, vars?: Record<string, string | number>) => {
    const base = translate(locale, key)
    if (!vars) return base
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      base
    )
  }

  const [search, setSearch] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const todayIso = new Date().toISOString().slice(0, 10)

  const attentionFiltered = attentionOnly
    ? clients.filter((c) => c.statusBucket === "at_risk")
    : clients

  const filtered = search.trim()
    ? attentionFiltered.filter(
        (c) =>
          c.displayName.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      )
    : attentionFiltered

  const handleSelect = (clientId: string) => {
    onSelect(clientId)
    const params = new URLSearchParams(searchParams.toString())
    params.set("selected", clientId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const navigateFilter = (next: { status: string; attention?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("status", next.status)
    if (next.attention) {
      params.set("attention", "1")
    } else {
      params.delete("attention")
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const activeChip =
    statusFilter === "archived" ? "archived" : attentionOnly ? "attention" : "all"

  const chipClass = (active: boolean) =>
    [
      "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors cursor-pointer select-none",
      active
        ? "bg-ink-900 text-cream border-transparent"
        : "border-[1.5px] border-stone-300 bg-surface text-ink-700 hover:bg-stone-100",
    ].join(" ")

  const bucketLabel = (row: CoachClientRow) => {
    if (!row.statusBucket) return null
    return {
      on_track: labels.bucketOnTrack,
      at_risk: labels.bucketAtRisk,
      new: labels.bucketNew,
    }[row.statusBucket]
  }

  const filterBar = (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label={labels.pageTitle}
    >
      <button
        type="button"
        role="tab"
        className={chipClass(activeChip === "all")}
        onClick={() => navigateFilter({ status: "active" })}
        aria-selected={activeChip === "all"}
      >
        {labels.filterAll}
      </button>
      <button
        type="button"
        role="tab"
        className={chipClass(activeChip === "attention")}
        onClick={() => navigateFilter({ status: "active", attention: true })}
        aria-selected={activeChip === "attention"}
      >
        {labels.filterAttention}
      </button>
    </div>
  )

  const searchBox = (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={labels.searchPlaceholder}
        aria-label={labels.searchPlaceholder}
        className="w-full min-h-[38px] rounded-[9px] border-[1.5px] border-stone-300 bg-surface py-2 pl-9 pr-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-pine/40"
      />
    </div>
  )

  if (clients.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3">
          {searchBox}
          {filterBar}
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={statusFilter === "archived" ? labels.emptyArchivedTitle : labels.emptyTitle}
            description={
              statusFilter === "archived"
                ? labels.emptyArchivedDescription
                : labels.emptyDescription
            }
            action={
              statusFilter === "archived" ? undefined : (
                <a
                  href="#invite-client"
                  className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-ink-900 px-5 text-sm font-semibold text-cream hover:bg-ink-700"
                >
                  {labels.inviteCta}
                </a>
              )
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search then filters — Web-MyClients order */}
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3">
        {searchBox}
        {filterBar}
      </div>

      <ul className="flex-1 overflow-y-auto" role="listbox" aria-label={labels.pageTitle}>
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-ink-500">
            {labels.searchEmpty}
          </li>
        ) : (
          filtered.map((client) => {
            const isSelected = client.clientId === selectedClientId
            const bucket = bucketLabel(client)
            const variant = client.statusBucket
              ? BUCKET_VARIANTS[client.statusBucket]
              : "inactive"

            const subtitle = buildActivitySubtitle({
              caloriesToday: client.caloriesToday,
              workoutsToday: client.workoutsToday,
              lastCheckinOn: client.lastCheckinOn,
              lastLogOn: client.lastLogOn,
              todayIso,
              statusBucket: client.statusBucket,
              since: client.since,
              t,
            })

            return (
              <li key={client.clientId} role="option" aria-selected={isSelected} className="border-b border-stone-150 last:border-b-0">
                <button
                  type="button"
                  className={[
                    "flex w-full items-center gap-3 px-4 py-[13px] text-left transition-colors hover:bg-stone-100",
                    isSelected ? "bg-pine-tint" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelect(client.clientId)}
                  aria-pressed={isSelected}
                >
                  <div className="shrink-0">
                    <Avatar name={client.displayName} src={client.avatarUrl} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {client.displayName}
                    </span>
                    <p className="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p>
                  </div>
                  {/* Status pill right-edge per Web-MyClients */}
                  {bucket ? (
                    <StatusPill variant={variant} label={bucket} className="shrink-0" />
                  ) : null}
                </button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
