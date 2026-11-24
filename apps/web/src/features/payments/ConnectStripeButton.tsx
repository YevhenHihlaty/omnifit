"use client"

import { useState, useTransition } from "react"
import { Button } from "@omnifit/ui"
import { startStripeConnectOnboarding } from "@/features/payments/actions"

type ConnectStripeButtonProps = {
  label: string
  pendingLabel?: string
  errorLabels?: Record<string, string>
  className?: string
  variant?: "primary" | "secondary" | "link"
}

export const ConnectStripeButton = ({
  label,
  pendingLabel,
  errorLabels = {},
  className,
  variant = "primary",
}: ConnectStripeButtonProps) => {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await startStripeConnectOnboarding()
      if (!result.success) {
        setError(errorLabels[result.error] ?? errorLabels.generic ?? result.error)
      }
    })
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={handleClick}
        aria-label={label}
      >
        {pending ? pendingLabel ?? label : label}
      </Button>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
