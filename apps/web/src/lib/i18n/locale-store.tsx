"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./constants"

/** Read the locale from the document cookie (client-side only). */
export const getClientLocale = (): Locale => {
  if (typeof document === "undefined") return DEFAULT_LOCALE

  for (const part of document.cookie.split(";")) {
    const [rawKey, rawVal] = part.split("=")
    if (rawKey?.trim() === LOCALE_COOKIE) {
      const val = rawVal?.trim() as Locale
      if (LOCALES.includes(val)) return val
    }
  }

  return DEFAULT_LOCALE
}

/** Set the locale cookie and trigger a page reload so server components re-render. */
export const setClientLocale = (locale: Locale): void => {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
  window.location.reload()
}

type LocaleContextValue = {
  locale: Locale
  setLocale: (next: Locale) => void
  locales: typeof LOCALES
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

type LocaleProviderProps = {
  /** Must match the cookie used for SSR (`html lang` / server translator). */
  initialLocale: Locale
  children: ReactNode
}

/**
 * Seeds client locale from the server cookie so Client Components don't
 * hydrate as DEFAULT_LOCALE while the cookie is pl/uk.
 */
export const LocaleProvider = ({
  initialLocale,
  children,
}: LocaleProviderProps) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    setClientLocale(next)
  }, [])

  const value = useMemo(
    () => ({ locale, setLocale, locales: LOCALES }),
    [locale, setLocale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

/** Hook: current locale + setter (triggers full reload to rehydrate server components). */
export const useLocale = (): LocaleContextValue => {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return ctx
}
