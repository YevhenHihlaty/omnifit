import type { Metadata } from "next"

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "")

export const absoluteUrl = (path = "/"): string =>
  `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`

export const marketingMetadata = (input: {
  title: string
  description: string
  path: string
}): Metadata => ({
  title: input.title,
  description: input.description,
  alternates: { canonical: absoluteUrl(input.path) },
  openGraph: {
    title: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    siteName: "OmniFit",
    type: "website",
  },
  robots: { index: true, follow: true },
})

/** App / auth surfaces stay out of search indexes for invite-only beta. */
export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}
