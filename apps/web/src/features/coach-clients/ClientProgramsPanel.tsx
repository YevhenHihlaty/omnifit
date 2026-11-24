import Link from "next/link"
import { ROUTES } from "@/lib/routes"

type ClientProgramsPanelProps = {
  labels: {
    programsEmpty: string
    programsEmptyBody: string
    programsViewLibrary: string
  }
}

export const ClientProgramsPanel = ({ labels }: ClientProgramsPanelProps) => (
  <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-stone-300 bg-surface px-6 py-16 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pine-tint">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--of-pine)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M17.5 14v6M14.5 17h6" />
      </svg>
    </div>
    <h3 className="font-display text-[15px] font-semibold text-ink-900">
      {labels.programsEmpty}
    </h3>
    <p className="mt-1.5 max-w-xs text-[13px] text-ink-500">
      {labels.programsEmptyBody}
    </p>
    <Link
      href={ROUTES.programs ?? "/programs"}
      className="mt-5 inline-flex min-h-10 items-center rounded-[10px] border-[1.5px] border-stone-300 px-4 text-sm font-semibold text-ink-900 hover:bg-stone-100"
    >
      {labels.programsViewLibrary}
    </Link>
  </div>
)
