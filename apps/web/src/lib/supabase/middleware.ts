import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import type { AuthError, User } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"

export type UpdateSupabaseSessionResult = {
  response: NextResponse
  user: User | null
  error: AuthError | null
}

/** Refresh the Supabase auth session cookies on each matched request. */
export const updateSupabaseSession = async (
  request: NextRequest
): Promise<UpdateSupabaseSessionResult> => {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Required so expired sessions are refreshed into the response cookies.
  const { data: { user }, error } = await supabase.auth.getUser()

  return { response, user, error: error ?? null }
}
