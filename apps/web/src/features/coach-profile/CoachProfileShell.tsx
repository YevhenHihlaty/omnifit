import Link from "next/link"
import { Avatar } from "@omnifit/ui"
import { ROUTES } from "@/lib/routes"
import type { ReactNode } from "react"

export type ProfileTab = "plans" | "locations" | "credentials" | "settings"

type CoachProfileShellProps = {
  displayName: string
  avatarUrl: string | null
  specialties: string[]
  activeTab: ProfileTab
  labels: {
    plans: string
    locations: string
    credentials: string
    settings: string
    tabsLabel: string
    editProfile: string
    viewPublicProfile: string
  }
  children: ReactNode
}

const tabHref = (tab: ProfileTab): string => {
  if (tab === "plans") return ROUTES.profilePlans
  if (tab === "locations") return ROUTES.profileLocations
  if (tab === "credentials") return ROUTES.profileCredentials
  return ROUTES.profileSettings
}

export const CoachProfileShell = ({
  displayName,
  avatarUrl,
  specialties,
  activeTab,
  labels,
  children,
}: CoachProfileShellProps) => {
  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "plans", label: labels.plans },
    { id: "locations", label: labels.locations },
    { id: "credentials", label: labels.credentials },
    { id: "settings", label: labels.settings },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            name={displayName}
            src={avatarUrl}
            size="lg"
            className="h-16 w-16 text-xl"
          />
          <div>
            <h1 className="font-display text-[21px] font-bold text-ink-900">
              {displayName}
            </h1>
            {specialties.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {specialties.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-pine-tint px-3 py-1 text-xs font-semibold text-pine-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={ROUTES.profile}
            className="flex items-center gap-1.5 px-1.5 py-2.5 text-[13.5px] font-semibold text-ink-700 hover:text-ink-900"
          >
            {labels.viewPublicProfile}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17L17 7M9 7H17V15" />
            </svg>
          </a>
          <Link
            href={ROUTES.profileSettings}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border-[1.5px] border-stone-300 px-4 text-sm font-medium text-ink-900 transition-colors hover:bg-stone-150"
          >
            {labels.editProfile}
          </Link>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-6 border-b border-stone-300"
        aria-label={labels.tabsLabel}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              className={`min-h-11 border-b-[2.5px] px-1 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-pine text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-900"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  )
}
