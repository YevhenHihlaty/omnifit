import React from "react"
import { cn } from "./cn"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "link"
  size?: "sm" | "md" | "lg"
}

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center font-medium rounded-[10px] transition-colors duration-fast",
      "focus-visible:outline-none focus-visible:shadow-[var(--of-focus-ring)]",
      "disabled:pointer-events-none disabled:bg-stone-150 disabled:text-ink-500 disabled:border disabled:border-stone-300 disabled:opacity-100",
      {
        "bg-pine text-surface hover:bg-pine-dark": variant === "primary",
        "border-[1.5px] border-ink-900 text-ink-900 hover:bg-stone-150 bg-transparent":
          variant === "secondary",
        "text-ink-700 hover:bg-stone-150": variant === "ghost",
        "bg-danger text-surface hover:opacity-90": variant === "destructive",
        "text-plum-dark underline-offset-4 hover:underline p-0 h-auto min-h-0 disabled:bg-transparent disabled:border-0":
          variant === "link",
        "text-sm min-h-11 px-3": size === "sm",
        "text-sm min-h-11 px-4": size === "md",
        "text-base min-h-12 px-6": size === "lg",
      },
      className
    )}
    {...props}
  />
)
