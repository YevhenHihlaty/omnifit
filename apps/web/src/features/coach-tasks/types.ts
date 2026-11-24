export type TaskStatus = "todo" | "done"

export type CoachTask = {
  id: string
  title: string
  status: TaskStatus
  dueAt: string | null
  clientId: string | null
  clientName: string | null
  notes: string | null
  taskType: string | null
}

export type ClientOption = {
  id: string
  displayName: string
}

export type TaskRow = {
  id: string
  title: string
  status: string
  due_at: string | null
  client_id: string | null
  notes: string | null
  task_type: string | null
  client?: { display_name: string | null } | { display_name: string | null }[] | null
}

const asProfile = (
  value: TaskRow["client"]
): { display_name: string | null } | null => {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0]
    return first && typeof first === "object" ? first : null
  }
  return value
}

export const mapTaskRow = (row: TaskRow): CoachTask => {
  const client = asProfile(row.client)
  return {
    id: row.id,
    title: row.title,
    status: row.status === "done" ? "done" : "todo",
    dueAt: row.due_at,
    clientId: row.client_id,
    clientName: client?.display_name?.trim() || null,
    notes: row.notes || null,
    taskType: row.task_type || null,
  }
}

export const formatTaskDue = (iso: string | null, locale: string): string => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDue = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round(
    (startDue.getTime() - startToday.getTime()) / 86_400_000
  )
  if (diff === 0) {
    return locale.startsWith("pl")
      ? "Dziś"
      : locale.startsWith("uk")
        ? "Сьогодні"
        : "Today"
  }
  if (diff === 1) {
    return locale.startsWith("pl")
      ? "Jutro"
      : locale.startsWith("uk")
        ? "Завтра"
        : "Tomorrow"
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}
