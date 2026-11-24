"use client"

import { createBrowserClient } from "@supabase/ssr"

// ponytail: placeholder fallback prevents build crash when env vars aren't set.
// Production must set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"

export const createSupabaseBrowserClient = () => createBrowserClient(url, key)
