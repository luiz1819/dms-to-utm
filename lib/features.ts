import { createAdminClient } from "@/lib/supabase/server"

export type FeatureKey = "export_kml"

export async function canUseFeature(plan: "free" | "pro", feature: FeatureKey) {
  if (plan === "pro") return true
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "feature_access").maybeSingle()
  const access = data?.value as Record<string, unknown> | null | undefined
  return access?.[feature] === true
}
