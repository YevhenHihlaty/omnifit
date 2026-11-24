import React from "react"
import { cn } from "./cn"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = ({ label, error, className, id, ...props }: InputProps) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-500">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full min-h-11 rounded-[10px] border-[1.5px] bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-500",
          "transition-[border-color,box-shadow] duration-fast",
          "focus:outline-none focus:border-pine focus:shadow-[var(--of-focus-ring)]",
          error ? "border-danger" : "border-stone-300",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
