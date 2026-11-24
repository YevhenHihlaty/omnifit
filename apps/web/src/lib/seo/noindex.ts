import type { Metadata } from "next"

/** Shared noindex for authenticated / onboarding / auth app shells. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}
