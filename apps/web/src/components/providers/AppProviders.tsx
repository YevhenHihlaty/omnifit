"use client"

import type { ReactNode } from "react"
import type { Locale } from "@/lib/i18n/constants"
import { LocaleProvider } from "@/lib/i18n/locale-store"

type AppProvidersProps = {
  children: ReactNode
  locale: Locale
}

/**
 * Root client provider tree.
 * Locale must come from the server cookie so SSR text matches hydration.
 */
export const AppProviders = ({ children, locale }: AppProvidersProps) => (
  <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
)
