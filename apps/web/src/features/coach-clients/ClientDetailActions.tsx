"use client"

import Link from "next/link"
import { useState } from "react"
import { ClientPlanEditor } from "./ClientPlanEditor"
import type { ClientPlanEditorLabels } from "./ClientPlanEditor"
import { ROUTES, coachClientLogTraining, messagesWithRelationship } from "@/lib/routes"

type HabitRow = {
  habitId: string
  title: string
  targetValue: number
  unit: string
  unitLabel: string | null
  currentValue: number
  done: boolean
}

type ClientDetailActionsProps = {
  clientId: string
  relationshipId: string | null
  messageLabel: string
  editPlanLabel: string
  logWorkoutLabel: string
  comingSoon: string
  planLabels: ClientPlanEditorLabels
  initialCalories: number | null
  initialProtein: number | null
  initialCarbs: number | null
  initialFat: number | null
  habits: HabitRow[]
}

export const ClientDetailActions = ({
  clientId,
  relationshipId,
  messageLabel,
  editPlanLabel,
  logWorkoutLabel,
  comingSoon,
  planLabels,
  initialCalories,
  initialProtein,
  initialCarbs,
  initialFat,
  habits,
}: ClientDetailActionsProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {relationshipId ? (
          <Link
            href={messagesWithRelationship(relationshipId)}
            className="inline-flex min-h-11 items-center rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-4 text-sm font-semibold text-ink-900 hover:border-pine"
          >
            {messageLabel}
          </Link>
        ) : (
          <Link
            href={ROUTES.messages}
            className="inline-flex min-h-11 items-center rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-4 text-sm font-semibold text-ink-900 hover:border-pine"
          >
            {messageLabel}
          </Link>
        )}
        <Link
          href={coachClientLogTraining(clientId)}
          className="inline-flex min-h-11 items-center rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-4 text-sm font-semibold text-ink-900 hover:border-pine"
        >
          {logWorkoutLabel}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center rounded-[9px] bg-ink-900 px-4 text-sm font-semibold text-cream hover:bg-ink-800"
        >
          {editPlanLabel}
        </button>
      </div>
      <ClientPlanEditor
        clientId={clientId}
        labels={planLabels}
        initialCalories={initialCalories}
        initialProtein={initialProtein}
        initialCarbs={initialCarbs}
        initialFat={initialFat}
        habits={habits}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
