"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@omnifit/ui"
import { markSessionPaidOffline } from "@/features/payments/actions"
import { receiptPath } from "@/lib/routes"

type MarkPaidOfflineButtonProps = {
  sessionId: string
  label: string
  pendingLabel?: string
  errorLabels?: Record<string, string>
}

export const MarkPaidOfflineButton = ({
  sessionId,
  label,
  pendingLabel,
  errorLabels = {},
}: MarkPaidOfflineButtonProps) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await markSessionPaidOffline(sessionId)
      if (!result.success) {
        setError(errorLabels[result.error] ?? errorLabels.generic ?? result.error)
        return
      }
      router.push(receiptPath(sessionId))
      router.refresh()
    })
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="secondary"
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
