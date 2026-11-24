import type { Metadata } from "next"
import { noIndexMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = noIndexMetadata

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
