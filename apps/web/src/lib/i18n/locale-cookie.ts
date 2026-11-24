import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./constants"

/** Parse locale from a raw cookie header string, falling back to default. */
export const parseLocaleFromCookie = (cookieHeader: string | undefined): Locale => {
  if (!cookieHeader) return DEFAULT_LOCALE

  for (const part of cookieHeader.split(";")) {
    const [rawKey, rawVal] = part.split("=")
    if (rawKey?.trim() === LOCALE_COOKIE) {
      const val = rawVal?.trim() as Locale
      if (LOCALES.includes(val)) return val
    }
  }

  return DEFAULT_LOCALE
}

/** Serialise a Set-Cookie value for the locale cookie (1 year, SameSite=Lax). */
export const serializeLocaleCookie = (locale: Locale): string =>
  `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
