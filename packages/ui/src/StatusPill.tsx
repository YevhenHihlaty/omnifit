import React from "react"
import { cn } from "./cn"

/** Design Doc status pills: On track / Paid / At risk / Pending / Refunded / New */
type StatusVariant = "active" | "pending" | "inactive" | "warning" | "danger" | "new"

type StatusPillProps = {
  variant?: StatusVariant
  label: string
  className?: string
}

const variantClasses: Record<StatusVariant, string> = {
  active: "bg-pine-tint text-pine-dark",
  pending: "bg-warning-tint text-warning",
  inactive: "bg-stone-150 text-ink-500",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  new: "bg-lilac text-plum-dark",
}

export const StatusPill = ({ variant = "inactive", label, className }: StatusPillProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      variantClasses[variant],
      className
    )}
  >
    {label}
  </span>
)
