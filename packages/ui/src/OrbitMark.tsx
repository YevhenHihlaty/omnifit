import React from "react"
import { cn } from "./cn"

type OrbitMarkProps = {
  className?: string
  /** Accessible name; omit for decorative (aria-hidden) */
  title?: string
  size?: number
}

/**
 * Orbit mark — stroke ring + filled upper-right dot (pine).
 * Design Doc: same color, never two-tone, no shadow/bevel.
 */
export const OrbitMark = ({ className, title, size = 28 }: OrbitMarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-pine shrink-0", className)}
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
    aria-label={title}
  >
    {title ? <title>{title}</title> : null}
    <circle
      cx="15"
      cy="17"
      r="10"
      stroke="currentColor"
      strokeWidth="2.25"
    />
    <circle cx="23.5" cy="8.5" r="3.25" fill="currentColor" />
  </svg>
)
