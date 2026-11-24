"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, EmptyState, StatusPill } from "@omnifit/ui"
import { CalendarDays, CheckSquare, MoreHorizontal, Plus } from "lucide-react"
import {
  createCoachTask,
  deleteCoachTask,
  setCoachTaskStatus,
  updateCoachTask,
} from "./actions"
import { formatTaskDue, type ClientOption, type CoachTask } from "./types"

export type CoachTasksLabels = {
  title: string
  subtitle: string
  newTask: string
  panelNew: string
  panelEdit: string
  panelCaption: string
  tabAll: string
  tabTodo: string
  tabDone: string
  emptyTitle: string
  emptyBody: string
  emptyCta: string
  loadFailed: string
  titleLabel: string
  titlePlaceholder: string
  dueLabel: string
  typeLabel: string
  typeOptions: { value: string; label: string }[]
  notesLabel: string
  notesPlaceholder: string
  clientLabel: string
  clientNone: string
  save: string
  saving: string
  cancel: string
  markDone: string
  markTodo: string
  delete: string
  edit: string
  moreOptions: string
  statusTodo: string
  statusDone: string
  errors: Record<string, string>
}

type CoachTasksViewProps = {
  tasks: CoachTask[]
  clients: ClientOption[]
  locale: string
  loadFailed: boolean
  labels: CoachTasksLabels
}

type FilterTab = "all" | "todo" | "done"

const emptyForm = () => ({
  title: "",
  dueAt: "",
  taskType: "",
  clientId: "",
  notes: "",
})

export const CoachTasksView = ({
  tasks,
  clients,
  locale,
  loadFailed,
  labels,
}: CoachTasksViewProps) => {
  const router = useRouter()
  const [tab, setTab] = useState<FilterTab>("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const todo = tasks.filter((t) => t.status === "todo").length
    const done = tasks.filter((t) => t.status === "done").length
    return { all: tasks.length, todo, done }
  }, [tasks])

  const filtered = useMemo(() => {
    if (tab === "all") return tasks
    return tasks.filter((t) => t.status === tab)
  }, [tasks, tab])

  const resolveError = (code: string) =>
    labels.errors[code] ?? labels.errors.create_failed ?? code

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm())
    setError(null)
    setMenuId(null)
  }

  const openEdit = (task: CoachTask) => {
    setEditingId(task.id)
    setForm({
      title: task.title,
      dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
      taskType: task.taskType ?? "",
      clientId: task.clientId ?? "",
      notes: task.notes ?? "",
    })
    setError(null)
    setMenuId(null)
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = editingId
        ? await updateCoachTask({
            taskId: editingId,
            title: form.title,
            dueAt: form.dueAt || null,
            taskType: form.taskType || null,
            clientId: form.clientId || null,
            notes: form.notes || null,
          })
        : await createCoachTask({
            title: form.title,
            dueAt: form.dueAt || null,
            taskType: form.taskType || null,
            clientId: form.clientId || null,
            notes: form.notes || null,
          })
      if (!result.success) {
        setError(resolveError(result.error))
        return
      }
      openNew()
      router.refresh()
    })
  }

  const handleToggle = (task: CoachTask) => {
    startTransition(async () => {
      await setCoachTaskStatus(task.id, task.status === "done" ? "todo" : "done")
      router.refresh()
    })
  }

  const handleDelete = (taskId: string) => {
    startTransition(async () => {
      await deleteCoachTask(taskId)
      if (editingId === taskId) openNew()
      setMenuId(null)
      router.refresh()
    })
  }

  const tabLabel = (id: FilterTab, count: number) => {
    const base =
      id === "all" ? labels.tabAll : id === "todo" ? labels.tabTodo : labels.tabDone
    return `${base} (${count})`
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold text-ink-900">
            {labels.title}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">{labels.subtitle}</p>
        </div>
        <Button type="button" onClick={openNew} aria-label={labels.newTask}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {labels.newTask}
        </Button>
      </div>

      {loadFailed ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div
            className="inline-flex rounded-[10px] bg-stone-150 p-1"
            role="tablist"
            aria-label={labels.title}
          >
            {(
              [
                ["all", counts.all],
                ["todo", counts.todo],
                ["done", counts.done],
              ] as const
            ).map(([id, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`min-h-9 rounded-[8px] px-3.5 text-sm font-semibold transition-colors ${
                  tab === id
                    ? "bg-surface text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-900"
                }`}
                onClick={() => setTab(id)}
              >
                {tabLabel(id, count)}
              </button>
            ))}
          </div>

          {filtered.length === 0 && !loadFailed ? (
            <div className="mt-4">
              <EmptyState
                icon={<CheckSquare className="h-8 w-8" aria-hidden />}
                title={labels.emptyTitle}
                description={labels.emptyBody}
                action={
                  <Button type="button" onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    {labels.emptyCta}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 overflow-hidden rounded-2xl border border-stone-300 bg-surface">
              {filtered.map((task) => (
                <li
                  key={task.id}
                  className={`relative flex items-center gap-4 border-b border-stone-150 px-5 py-4 last:border-b-0 ${
                    task.status === "done" ? "opacity-80" : ""
                  } ${editingId === task.id ? "bg-pine-tint/20" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-stone-300 accent-pine"
                    checked={task.status === "done"}
                    onChange={() => handleToggle(task)}
                    aria-label={
                      task.status === "done" ? labels.markTodo : labels.markDone
                    }
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openEdit(task)}
                  >
                    <p
                      className={`text-sm font-semibold text-ink-900 ${
                        task.status === "done"
                          ? "text-ink-500 line-through"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      {task.dueAt ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          {formatTaskDue(task.dueAt, locale)}
                        </span>
                      ) : null}
                      {task.clientName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-150 py-0.5 pl-0.5 pr-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky text-[9px] font-semibold text-ink-900">
                            {task.clientName
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase() ?? "")
                              .join("")}
                          </span>
                          {task.clientName}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  <StatusPill
                    label={
                      task.status === "done"
                        ? labels.statusDone
                        : labels.statusTodo
                    }
                    variant={task.status === "done" ? "active" : "inactive"}
                    className={
                      task.status === "done" ? undefined : "text-ink-700"
                    }
                  />
                  <div className="relative">
                    <button
                      type="button"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-ink-500 hover:bg-stone-150"
                      aria-label={labels.moreOptions}
                      aria-expanded={menuId === task.id}
                      onClick={() =>
                        setMenuId(menuId === task.id ? null : task.id)
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </button>
                    {menuId === task.id ? (
                      <div className="absolute right-0 z-10 mt-1 min-w-[140px] rounded-[10px] border border-stone-300 bg-surface py-1 shadow-md">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-150"
                          onClick={() => openEdit(task)}
                        >
                          {labels.edit}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-stone-150"
                          onClick={() => handleDelete(task.id)}
                        >
                          {labels.delete}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="w-full shrink-0 rounded-2xl border border-stone-300 bg-surface p-5 lg:w-[380px]"
          aria-label={editingId ? labels.panelEdit : labels.panelNew}
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {labels.panelCaption}
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink-900">
            {editingId ? labels.panelEdit : labels.panelNew}
          </h2>

          <label className="mt-5 block text-sm font-medium text-ink-700" htmlFor="task-title">
            {labels.titleLabel}
          </label>
          <input
            id="task-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={labels.titlePlaceholder}
            className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700" htmlFor="task-due">
                {labels.dueLabel}
              </label>
              <input
                id="task-due"
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm focus:border-pine focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700" htmlFor="task-type">
                {labels.typeLabel}
              </label>
              <select
                id="task-type"
                value={form.taskType}
                onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm focus:border-pine focus:outline-none"
              >
                <option value="">—</option>
                {labels.typeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-ink-700" htmlFor="task-client">
              {labels.clientLabel}
            </label>
            <select
              id="task-client"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm focus:border-pine focus:outline-none"
            >
              <option value="">{labels.clientNone}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-ink-700" htmlFor="task-notes">
              {labels.notesLabel}
            </label>
            <textarea
              id="task-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={labels.notesPlaceholder}
              rows={3}
              className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 py-2.5 text-sm focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
            />
          </div>

          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2.5">
            <Button type="button" variant="secondary" onClick={openNew} disabled={pending}>
              {labels.cancel}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={pending || !form.title.trim()}
            >
              {pending ? labels.saving : labels.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
