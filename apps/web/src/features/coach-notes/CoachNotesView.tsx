"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, EmptyState } from "@omnifit/ui"
import { NotebookPen, Plus, Search } from "lucide-react"
import {
  createCoachNote,
  deleteCoachNote,
  updateCoachNote,
} from "./actions"
import {
  formatNoteCreated,
  type CoachNote,
  type NoteClientOption,
} from "./types"

export type CoachNotesLabels = {
  title: string
  subtitle: string
  newNote: string
  searchPlaceholder: string
  editorCaption: string
  editorNew: string
  editorEdit: string
  emptyTitle: string
  emptyBody: string
  emptyCta: string
  searchEmpty: string
  loadFailed: string
  titleLabel: string
  titlePlaceholder: string
  bodyLabel: string
  bodyPlaceholder: string
  clientLabel: string
  clientNone: string
  save: string
  saving: string
  discard: string
  delete: string
  errors: Record<string, string>
}

type CoachNotesViewProps = {
  notes: CoachNote[]
  clients: NoteClientOption[]
  locale: string
  loadFailed: boolean
  labels: CoachNotesLabels
}

const emptyForm = () => ({
  title: "",
  body: "",
  clientId: "",
})

const clientInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")

export const CoachNotesView = ({
  notes,
  clients,
  locale,
  loadFailed,
  labels,
}: CoachNotesViewProps) => {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)
  const [form, setForm] = useState(() => {
    const first = notes[0]
    return first
      ? { title: first.title, body: first.body, clientId: first.clientId ?? "" }
      : emptyForm()
  })
  const [isCreating, setIsCreating] = useState(notes.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (n.clientName?.toLowerCase().includes(q) ?? false)
    )
  }, [notes, query])

  const resolveError = (code: string) =>
    labels.errors[code] ?? labels.errors.create_failed ?? code

  const selectNote = (note: CoachNote) => {
    setSelectedId(note.id)
    setIsCreating(false)
    setForm({
      title: note.title,
      body: note.body,
      clientId: note.clientId ?? "",
    })
    setError(null)
  }

  const openCreate = () => {
    setSelectedId(null)
    setIsCreating(true)
    setForm(emptyForm())
    setError(null)
  }

  const handleDiscard = () => {
    if (isCreating) {
      const first = notes[0]
      if (first) selectNote(first)
      else openCreate()
      return
    }
    const current = notes.find((n) => n.id === selectedId)
    if (current) selectNote(current)
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const title = form.title.trim() || labels.titlePlaceholder
      const result =
        isCreating || !selectedId
          ? await createCoachNote({
              title,
              body: form.body,
              clientId: form.clientId || null,
            })
          : await updateCoachNote({
              noteId: selectedId,
              title,
              body: form.body,
              clientId: form.clientId || null,
            })
      if (!result.success) {
        setError(resolveError(result.error))
        return
      }
      if (result.success && "noteId" in result && result.noteId) {
        setSelectedId(result.noteId)
        setIsCreating(false)
      }
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!selectedId || isCreating) return
    startTransition(async () => {
      await deleteCoachNote(selectedId)
      openCreate()
      router.refresh()
    })
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
        <Button type="button" onClick={openCreate} aria-label={labels.newNote}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {labels.newNote}
        </Button>
      </div>

      {loadFailed ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      {notes.length === 0 && !loadFailed && isCreating ? (
        <div className="mt-8 grid gap-7 lg:grid-cols-[400px_minmax(0,1fr)]">
          <EmptyState
            icon={<NotebookPen className="h-8 w-8" aria-hidden />}
            title={labels.emptyTitle}
            description={labels.emptyBody}
            action={
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                {labels.emptyCta}
              </Button>
            }
          />
          <NoteEditor
            labels={labels}
            form={form}
            setForm={setForm}
            clients={clients}
            pending={pending}
            error={error}
            isCreating
            onDiscard={handleDiscard}
            onSave={handleSave}
            onDelete={undefined}
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-start">
          <div className="flex w-full shrink-0 flex-col gap-3.5 lg:w-[400px]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
                className="w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface py-2 pl-10 pr-3 text-sm focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="px-1 text-sm text-ink-500">
                {notes.length > 0 ? labels.searchEmpty : labels.emptyTitle}
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {filtered.map((note) => {
                  const selected = !isCreating && note.id === selectedId
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => selectNote(note)}
                        className={`w-full rounded-[14px] border bg-surface px-4 py-3.5 text-left transition-colors ${
                          selected
                            ? "border-plum shadow-[0_0_0_2px_var(--of-lilac)]"
                            : "border-stone-300 hover:border-pine"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-ink-900">
                            {note.title || labels.titlePlaceholder}
                          </span>
                          <span className="shrink-0 text-xs text-ink-500">
                            {formatNoteCreated(note.createdAt, locale)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm text-ink-700">
                          {note.bodyPreview || "—"}
                        </p>
                        {note.clientName ? (
                          <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-sage text-[9px] font-bold text-ink-900">
                              {clientInitials(note.clientName)}
                            </span>
                            {note.clientName}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <NoteEditor
            labels={labels}
            form={form}
            setForm={setForm}
            clients={clients}
            pending={pending}
            error={error}
            isCreating={isCreating}
            onDiscard={handleDiscard}
            onSave={handleSave}
            onDelete={!isCreating && selectedId ? handleDelete : undefined}
          />
        </div>
      )}
    </div>
  )
}

type FormState = { title: string; body: string; clientId: string }

const NoteEditor = ({
  labels,
  form,
  setForm,
  clients,
  pending,
  error,
  isCreating,
  onDiscard,
  onSave,
  onDelete,
}: {
  labels: CoachNotesLabels
  form: FormState
  setForm: (next: FormState) => void
  clients: NoteClientOption[]
  pending: boolean
  error: string | null
  isCreating: boolean
  onDiscard: () => void
  onSave: () => void
  onDelete?: () => void
}) => (
  <form
    className="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-surface p-8"
    aria-label={isCreating ? labels.editorNew : labels.editorEdit}
    onSubmit={(e) => {
      e.preventDefault()
      onSave()
    }}
  >
    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
      {labels.editorCaption}
    </p>
    <h2 className="mt-1 font-display text-lg font-semibold text-ink-900">
      {isCreating ? labels.editorNew : labels.editorEdit}
    </h2>

    <label className="mt-5 block text-sm font-medium text-ink-700" htmlFor="note-title">
      {labels.titleLabel}
    </label>
    <input
      id="note-title"
      value={form.title}
      onChange={(e) => setForm({ ...form, title: e.target.value })}
      placeholder={labels.titlePlaceholder}
      className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
    />

    <label className="mt-3 block text-sm font-medium text-ink-700" htmlFor="note-client">
      {labels.clientLabel}
    </label>
    <select
      id="note-client"
      value={form.clientId}
      onChange={(e) => setForm({ ...form, clientId: e.target.value })}
      className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
    >
      <option value="">{labels.clientNone}</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.displayName}
        </option>
      ))}
    </select>

    <label className="mt-3 block text-sm font-medium text-ink-700" htmlFor="note-body">
      {labels.bodyLabel}
    </label>
    <textarea
      id="note-body"
      value={form.body}
      onChange={(e) => setForm({ ...form, body: e.target.value })}
      placeholder={labels.bodyPlaceholder}
      rows={12}
      className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 px-3 py-2 text-sm focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
    />

    {error ? (
      <p className="mt-3 text-sm text-danger" role="alert">
        {error}
      </p>
    ) : null}

    <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          className="mr-auto"
          onClick={onDelete}
          disabled={pending}
        >
          {labels.delete}
        </Button>
      ) : null}
      <Button type="button" variant="secondary" onClick={onDiscard} disabled={pending}>
        {labels.discard}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.save}
      </Button>
    </div>
  </form>
)
