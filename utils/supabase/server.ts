// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()   // reads cookies itself — nothing passed in

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
            // because middleware refreshes the session on every request
          }
        },
      },
    }
  )
}

// One Supabase Auth round trip per page render. Pages and AppShell both need the
// user; without this each called getUser() separately (a network request each).
// Same return shape as supabase.auth.getUser(). Use in Server Components only.
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})
