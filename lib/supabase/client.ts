"use client"

import { useMemo } from "react"
import { useSession } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"

export function useSupabase() {
  const { session } = useSession()

  return useMemo(
    () =>
      createClient(process.env.SUPABASE_URL_3!, process.env.SUPABASE_PUBLISHABLE_KEY_3!, {
        accessToken: async () => (await session?.getToken()) ?? null,
      }),
    [session],
  )
}
