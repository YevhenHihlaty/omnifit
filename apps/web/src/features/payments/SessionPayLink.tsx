"use client"

import Link from "next/link"
import { clientCheckoutPath } from "@/lib/routes"

type SessionPayLinkProps = {
  sessionId: string
  label: string
  featured?: boolean
}

/** Links to in-app checkout summary (fee line items) before Stripe Hosted. */
export const SessionPayLink = ({
  sessionId,
  label,
  featured = false,
}: SessionPayLinkProps) => (
  <Link
    href={clientCheckoutPath(sessionId)}
    aria-label={label}
    className={
      featured
        ? "mt-3 inline-flex h-11 w-full items-center justify-center rounded-[10px] border border-cream/40 bg-cream text-sm font-semibold text-pine-dark transition-colors hover:bg-surface focus-visible:outline-none focus-visible:shadow-[var(--of-focus-ring)]"
        : "mt-3 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-pine text-sm font-semibold text-surface transition-colors hover:bg-pine-dark focus-visible:outline-none focus-visible:shadow-[var(--of-focus-ring)]"
    }
  >
    {label}
  </Link>
)

export { MarkPaidOfflineButton } from "./SessionPaymentButtons"
