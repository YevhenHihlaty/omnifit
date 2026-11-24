import type { Locale } from "./constants"

// Loaded at module level — small JSON files, fine to import statically.
// vitest coverage excludes this file (src/lib/i18n/messages/**).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const en = require("../../../messages/en.json") as Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pl = require("../../../messages/pl.json") as Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const uk = require("../../../messages/uk.json") as Record<string, unknown>

const catalog: Record<Locale, Record<string, unknown>> = { en, pl, uk }

export const getMessages = (locale: Locale): Record<string, unknown> =>
  catalog[locale] ?? catalog.en
