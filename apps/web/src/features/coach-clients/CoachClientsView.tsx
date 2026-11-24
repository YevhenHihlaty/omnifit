"use client"

import { useState } from "react"
import { CoachClientRosterList } from "./CoachClientRosterList"
import { CoachClientPreviewPane } from "./CoachClientPreviewPane"
import type { CoachClientRow } from "./types"
import type { CoachClientsLabels } from "./labels"

type CoachClientsViewProps = {
  clients: CoachClientRow[]
  labels: CoachClientsLabels
  initialSelectedId?: string | null
  statusFilter?: "active" | "archived"
  attentionOnly?: boolean
  templateId?: string | null
  logWithTemplateLabel?: string
}

export const CoachClientsView = ({
  clients,
  labels,
  initialSelectedId,
  statusFilter = "active",
  attentionOnly = false,
  templateId = null,
  logWithTemplateLabel,
}: CoachClientsViewProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null
  )

  const selectedClient = clients.find((c) => c.clientId === selectedId) ?? null

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-[14px] border border-stone-300 bg-surface">
      {/* Left pane: roster list — w-[400px] per Web-MyClients spec */}
      <div className="w-[400px] shrink-0 overflow-hidden border-r border-stone-300">
        <CoachClientRosterList
          clients={clients}
          labels={labels}
          selectedClientId={selectedId}
          onSelect={setSelectedId}
          statusFilter={statusFilter}
          attentionOnly={attentionOnly}
        />
      </div>

      {/* Right pane: preview */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <CoachClientPreviewPane
          client={selectedClient}
          labels={labels}
          templateId={templateId}
          logWithTemplateLabel={logWithTemplateLabel}
        />
      </div>
    </div>
  )
}
