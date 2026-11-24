import { AppProviders } from "@/components/providers/AppProviders"
import "@/styles/globals.css"
import { Inter, Space_Grotesk } from "next/font/google"
import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { LOCALE_COOKIE, LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/constants"
import type { Locale } from "@/lib/i18n/constants"
import type { Metadata } from "next"

// Space Grotesk: latin + latin-ext (PL). No Cyrillic glyphs — Inter is the fallback stack.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
})

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: {
    default: "OmniFit",
    template: "%s | OmniFit",
  },
  description: "The platform built for serious coaches and the clients they serve.",
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value as Locale | undefined
  const lang: Locale = raw && LOCALES.includes(raw) ? raw : DEFAULT_LOCALE

  return (
    <html lang={lang} className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="font-body bg-cream text-ink-900 antialiased">{/* Inter + Space Grotesk via CSS vars */}
        <AppProviders locale={lang}>{children}</AppProviders>
      </body>
    </html>
  )
}
