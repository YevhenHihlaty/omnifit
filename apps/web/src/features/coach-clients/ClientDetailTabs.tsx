"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { coachClientDetail, messagesWithRelationship } from "@/lib/routes"
import type { SnapshotLabels } from "@/features/coach-clients/labels"

export type ClientDetailTab =
  | "snapshot"
  | "programs"
  | "history"
  | "analytics"
  | "messages"
  | "notes"

type ClientDetailTabsProps = {
  clientId: string
  activeTab: ClientDetailTab
  labels: SnapshotLabels
  relationshipId?: string | null
}

const DisabledTab = ({
  label,
  comingSoon,
}: {
  label: string
  comingSoon: string
}) => (
  <span
    role="tab"
    aria-selected={false}
    aria-disabled
    title={comingSoon}
    className="cursor-default border-b-2 border-transparent pb-3 text-sm font-semibold text-ink-400"
  >
    {label}
  </span>
)

const TabLink = ({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) => (
  <Link
    href={href}
    role="tab"
    aria-selected={active}
    className={`border-b-[2.5px] pb-3 text-sm font-semibold ${
      active
        ? "border-pine text-ink-900"
        : "border-transparent text-ink-500 hover:text-ink-900"
    }`}
  >
    {children}
  </Link>
)

export const ClientDetailTabs = ({
  clientId,
  activeTab,
  labels,
  relationshipId,
}: ClientDetailTabsProps) => {
  const base = coachClientDetail(clientId)
  return (
    <div
      className="flex flex-wrap gap-6 border-b border-stone-300"
      role="tablist"
      aria-label={labels.snapshotTitle}
    >
      <TabLink href={base} active={activeTab === "snapshot"}>
        {labels.detailTabSnapshot}
      </TabLink>
      <TabLink href={`${base}?tab=programs`} active={activeTab === "programs"}>
        {labels.detailTabPrograms}
      </TabLink>
      <TabLink href={`${base}?tab=history`} active={activeTab === "history"}>
        {labels.detailTabHistory}
      </TabLink>
      <TabLink
        href={`${base}?tab=analytics`}
        active={activeTab === "analytics"}
      >
        {labels.detailTabAnalytics}
      </TabLink>
      {relationshipId ? (
        <TabLink
          href={messagesWithRelationship(relationshipId)}
          active={activeTab === "messages"}
        >
          {labels.detailTabMessages}
        </TabLink>
      ) : (
        <DisabledTab
          label={labels.detailTabMessages}
          comingSoon={labels.comingSoon}
        />
      )}
      <TabLink href={`${base}?tab=notes`} active={activeTab === "notes"}>
        {labels.detailTabNotes}
      </TabLink>
    </div>
  )
}
