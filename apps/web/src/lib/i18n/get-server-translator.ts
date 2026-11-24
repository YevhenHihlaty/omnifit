"use server"

import { cookies } from "next/headers"
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./constants"
import { makeTranslator } from "./translate"

/** Returns a curried translate fn for use in Server Components. */
export const getServerTranslator = async () => {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value as Locale | undefined
  const locale: Locale = raw && LOCALES.includes(raw) ? raw : DEFAULT_LOCALE
  return { t: makeTranslator(locale), locale }
}
