import React from "react"
import { cn } from "./cn"

// Pastel CSS vars cycle — ordinal mod 6 maps to --of-pastel-{1..6}
const PASTEL_COUNT = 6

const getPastelIndex = (name: string): number => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return (hash % PASTEL_COUNT) + 1
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type AvatarProps = {
  name: string
  src?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
}

export const Avatar = ({ name, src, size = "md", className }: AvatarProps) => {
  const idx = getPastelIndex(name)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    )
  }

  return (
    <div
      aria-label={name}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold select-none",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `var(--of-pastel-${idx})`,
        color: "var(--of-ink-900)",
      }}
    >
      {getInitials(name)}
    </div>
  )
}
