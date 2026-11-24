import type { Locale } from "./constants"
import { getMessages } from "./messages"

/**
 * Resolve a dot-separated key (e.g. "home.tagline") from the locale catalog.
 * Returns the key itself when not found — always visible in UI, never silent.
 */
export const translate = (locale: Locale, key: string): string => {
  const messages = getMessages(locale)

  const value = key.split(".").reduce<unknown>((obj, segment) => {
    if (obj != null && typeof obj === "object") {
      return (obj as Record<string, unknown>)[segment]
    }
    return undefined
  }, messages)

  return typeof value === "string" ? value : key
}

/** Convenience: curried translator for a given locale. */
export const makeTranslator =
  (locale: Locale) =>
  (key: string): string =>
    translate(locale, key)
