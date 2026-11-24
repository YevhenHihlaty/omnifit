import { MarketingFooter } from "@/components/shell/MarketingFooter"
import { MarketingHeader } from "@/components/shell/MarketingHeader"
import type { ReactNode } from "react"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <MarketingHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <MarketingFooter />
    </div>
  )
}
