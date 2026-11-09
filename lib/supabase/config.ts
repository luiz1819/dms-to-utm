const supabaseUrl = process.env.SUPABASE_URL_3
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY_3
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY_2

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl && supabaseSecretKey)
}
