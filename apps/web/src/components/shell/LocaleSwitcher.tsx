"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import type { Locale } from "@/lib/i18n/constants"

const LOCALE_CODES: Record<Locale, string> = {
  en: "EN",
  pl: "PL",
  uk: "UK",
}

const LOCALE_NAME_KEYS: Record<Locale, string> = {
  en: "nav.langEn",
  pl: "nav.langPl",
  uk: "nav.langUk",
}

/** Foldable language control — click to slide open the locale list. */
export const LocaleSwitcher = () => {
  const { locale, setLocale, locales } = useLocale()
  const t = (key: string) => translate(locale, key)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return

    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const handleSelect = (next: Locale) => {
    setOpen(false)
    if (next !== locale) setLocale(next)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold text-ink-700 transition-colors duration-fast hover:bg-stone-150"
        aria-label={t("nav.language")}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden className="text-ink-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        <span>{LOCALE_CODES[locale]}</span>
        <span
          className={`text-ink-500 transition-transform duration-fast ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        id={listId}
        role="listbox"
        aria-label={t("nav.language")}
        aria-hidden={!open}
        className={`absolute right-0 top-full z-50 mt-1.5 origin-top overflow-hidden rounded-[10px] border border-stone-300 bg-surface shadow-sm transition-[max-height,opacity,transform] duration-fast ${
          open
            ? "max-h-48 translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
        }`}
      >
        <ul className="min-w-[10.5rem] py-1">
          {locales.map((loc) => {
            const selected = loc === locale
            return (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={open ? 0 : -1}
                  onClick={() => handleSelect(loc)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm transition-colors duration-fast ${
                    selected
                      ? "bg-pine-tint font-semibold text-pine-dark"
                      : "text-ink-700 hover:bg-stone-150"
                  }`}
                >
                  <span>{t(LOCALE_NAME_KEYS[loc])}</span>
                  <span className="text-xs font-medium text-ink-500">{LOCALE_CODES[loc]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
