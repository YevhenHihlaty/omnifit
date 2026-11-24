import React, { useId } from "react"
import { cn } from "./cn"

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export const Toggle = ({ checked, onChange, label, disabled, className }: ToggleProps) => {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:shadow-[var(--of-focus-ring)]",
          checked ? "bg-pine" : "bg-stone-300",
          disabled && "pointer-events-none"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-fast",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {label && <span className="text-sm text-ink-900">{label}</span>}
    </label>
  )
}
