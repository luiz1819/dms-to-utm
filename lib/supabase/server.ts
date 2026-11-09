import "server-only"

import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL_3!

/** Respects RLS: requests are authenticated with the current Clerk session token. */
export function createServerClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_PUBLISHABLE_KEY_3!, {
    accessToken: async () => (await auth()).getToken(),
  })
}

/** Bypasses RLS. Server-only: never import from a Client Component. */
export function createAdminClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY_2!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
