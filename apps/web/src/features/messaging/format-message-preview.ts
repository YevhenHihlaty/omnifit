/** Single-line preview for inbox rows; collapses whitespace. */
export const formatMessagePreview = (
  body: string | null | undefined,
  emptyLabel: string
): string => {
  const trimmed = body?.trim()
  if (!trimmed) return emptyLabel
  const collapsed = trimmed.replace(/\s+/g, " ")
  if (collapsed.length <= 80) return collapsed
  return `${collapsed.slice(0, 77)}…`
}
