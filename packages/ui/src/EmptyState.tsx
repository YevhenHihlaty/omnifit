import React from "react"
import { cn } from "./cn"

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** Design Doc Web-EmptyStates: solid surface card, 16px radius, 80px stone-150 icon well. */
export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center rounded-xl border border-stone-300 bg-surface px-7 py-8 text-center",
      className
    )}
  >
    {icon && (
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-stone-150 text-ink-500">
        {icon}
      </div>
    )}
    <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
    {description && <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-ink-500">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
)
