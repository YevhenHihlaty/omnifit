"use client"

import { OrbitMark } from "@omnifit/ui"
import { useLocale } from "@/lib/i18n/locale-store"
import { translate } from "@/lib/i18n/translate"
import {
  LayoutDashboard,
  Users,
  Plus,
  CalendarDays,
  Dumbbell,
  MessageSquare,
  BarChart3,
  Settings,
  CheckSquare,
  NotebookPen,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import type { ReactNode } from "react"

type SidebarRole = "coach" | "client"

type AppSidebarProps = {
  role?: SidebarRole
  displayName?: string
  tier?: string
}

type NavItem = {
  id: string
  labelKey: string
  href: string
  icon: ReactNode
  disabled?: boolean
}

export const AppSidebar = ({
  role = "coach",
  displayName,
  tier = "free",
}: AppSidebarProps) => {
  const { locale } = useLocale()
  const pathname = usePathname()
  const t = (key: string) => translate(locale, key)
  const isPro = tier === "pro"
  const name = displayName?.trim() || t("shell.coachName")
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || t("shell.coachInitials")

  const clientNav: NavItem[] = [
    { id: "home", labelKey: "shell.home", href: ROUTES.clientHome, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "log", labelKey: "shell.log", href: ROUTES.clientLog, icon: <Plus className="h-4 w-4" /> },
    { id: "calendar", labelKey: "shell.calendar", href: ROUTES.clientCalendar, icon: <CalendarDays className="h-4 w-4" /> },
    { id: "messages", labelKey: "shell.messages", href: ROUTES.messages, icon: <MessageSquare className="h-4 w-4" /> },
    { id: "progress", labelKey: "shell.progress", href: ROUTES.clientProgress, icon: <BarChart3 className="h-4 w-4" /> },
    { id: "coaches", labelKey: "shell.myCoaches", href: ROUTES.clientMyCoaches, icon: <Users className="h-4 w-4" /> },
    { id: "settings", labelKey: "shell.settings", href: ROUTES.clientSettings, icon: <Settings className="h-4 w-4" /> },
  ]

  const coachPrimary: NavItem[] = [
    { id: "dash", labelKey: "shell.dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "clients", labelKey: "shell.myClients", href: "/clients", icon: <Users className="h-4 w-4" /> },
    { id: "sessions", labelKey: "shell.sessions", href: ROUTES.sessions, icon: <CalendarDays className="h-4 w-4" /> },
    { id: "programs", labelKey: "shell.programs", href: ROUTES.programs, icon: <Dumbbell className="h-4 w-4" /> },
    { id: "messages", labelKey: "shell.messages", href: ROUTES.messages, icon: <MessageSquare className="h-4 w-4" /> },
    { id: "tasks", labelKey: "shell.tasks", href: ROUTES.tasks, icon: <CheckSquare className="h-4 w-4" /> },
    { id: "notes", labelKey: "shell.notes", href: ROUTES.notes, icon: <NotebookPen className="h-4 w-4" /> },
  ]

  const coachGeneral: NavItem[] = [
    { id: "reports", labelKey: "shell.reports", href: "/reports", icon: <BarChart3 className="h-4 w-4" />, disabled: true },
    { id: "settings", labelKey: "shell.settings", href: ROUTES.profileSettings, icon: <Settings className="h-4 w-4" /> },
  ]

  const renderLink = ({ id, labelKey, href, icon, disabled }: NavItem) => {
    const active = !disabled && (pathname === href || pathname.startsWith(`${href}/`))
    const label = t(labelKey)

    if (disabled) {
      return (
        <span
          key={id}
          title={t("shell.comingSoon")}
          className="flex min-h-11 cursor-not-allowed items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium text-stone-300/50"
          aria-disabled="true"
        >
          {icon}
          {label}
        </span>
      )
    }

    return (
      <Link
        key={id}
        href={href}
        className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors duration-fast ${
          active
            ? "bg-pine text-surface"
            : "text-stone-300 hover:bg-ink-700 hover:text-cream"
        }`}
      >
        {icon}
        {label}
      </Link>
    )
  }

  return (
    <aside
      className="flex h-full w-[var(--of-sidebar-w)] flex-col bg-ink-900 px-3 py-6"
      aria-label={t("shell.navLabel")}
    >
      <div className="mb-8 flex items-center gap-2 px-3">
        <OrbitMark size={24} className="text-pine" title="OmniFit" />
        <span className="font-display text-lg font-bold text-cream">OmniFit</span>
      </div>

      {role === "coach" ? (
        <>
          <nav className="flex flex-col gap-1">{coachPrimary.map(renderLink)}</nav>
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {t("shell.general")}
          </p>
          <nav className="flex flex-col gap-1">{coachGeneral.map(renderLink)}</nav>

          <div className="mt-auto space-y-3 px-1 pt-6">
            {!isPro ? (
              <div className="rounded-[10px] bg-pine-tint/10 border border-pine-tint/22 px-3 py-3 flex flex-col gap-2">
                <span className="font-display font-semibold text-sm text-cream">
                  {t("shell.goPro")}
                </span>
                <p className="text-xs leading-relaxed text-stone-300">{t("shell.goProHint")}</p>
                <Link
                  href={ROUTES.billing}
                  className="mt-1 h-[34px] flex items-center justify-center rounded-[8px] bg-pine text-surface text-xs font-semibold hover:bg-pine-dark transition-colors"
                >
                  {t("shell.upgrade")}
                </Link>
              </div>
            ) : null}
            <div className="flex items-center gap-2.5 rounded-[10px] px-2 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage text-xs font-semibold text-ink-900">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-cream">{name}</p>
                <p className="text-xs text-stone-300">
                  {isPro ? t("shell.proPlan") : t("shell.freePlan")}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <nav className="flex flex-1 flex-col gap-1">{clientNav.map(renderLink)}</nav>
      )}
    </aside>
  )
}
