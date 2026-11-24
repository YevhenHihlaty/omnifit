"use client"

import { useState } from "react"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"

type MiniCalendarProps = {
  sessionDates?: string[]
  scheduleLabel: string
  prevLabel: string
  nextLabel: string
}

const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

export const MiniCalendar = ({
  sessionDates = [],
  scheduleLabel,
  prevLabel,
  nextLabel,
}: MiniCalendarProps) => {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const sessionDateSet = new Set(sessionDates)

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  const firstDay = new Date(viewYear, viewMonth, 1)
  // Monday-first: 0=Mon…6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { day: number; inMonth: boolean }[] = []
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: prevMonthDays - startOffset + 1 + i, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true })
  }
  const remaining = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false })
  }

  const isToday = (day: number, inMonth: boolean) =>
    inMonth &&
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear()

  const hasSession = (day: number, inMonth: boolean) => {
    if (!inMonth) return false
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return sessionDateSet.has(iso)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  return (
    <div className="rounded-[16px] border border-stone-300 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink-900">{monthLabel}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label={prevLabel}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-stone-300 bg-surface text-ink-500 hover:bg-stone-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label={nextLabel}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border border-stone-300 bg-surface text-ink-500 hover:bg-stone-100"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="flex h-[34px] items-center justify-center text-[11px] font-semibold text-ink-500"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className="relative flex h-[34px] items-center justify-center text-[12px]"
          >
            {isToday(cell.day, cell.inMonth) ? (
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink-900 text-[12px] text-cream">
                {cell.day}
              </span>
            ) : (
              <span className={cell.inMonth ? "text-ink-700" : "text-stone-300"}>
                {cell.day}
              </span>
            )}
            {hasSession(cell.day, cell.inMonth) ? (
              <span className="absolute bottom-[2px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pine" />
            ) : null}
          </div>
        ))}
      </div>

      <Link
        href={ROUTES.sessions}
        className="mt-3 flex h-[38px] w-full items-center justify-center rounded-[9px] bg-pine text-[13px] font-semibold text-surface hover:bg-pine-dark"
      >
        {scheduleLabel}
      </Link>
    </div>
  )
}
