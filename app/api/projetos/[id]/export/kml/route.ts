import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { canUseFeature } from "@/lib/features"
import { buildKml } from "@/lib/export/kml"
import { createAdminClient } from "@/lib/supabase/server"
import { getUsageStatus, incrementUsage } from "@/lib/usage"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUser()
    const { id } = await params
    const usage = await getUsageStatus(userId)
    if (!(await canUseFeature(usage.plan, "export_kml"))) return NextResponse.json({ error: "KML não está disponível para o seu plano." }, { status: 403 })

    const supabase = createAdminClient()
    const { data: project } = await supabase.from("projects").select("id,user_id,name,vertices,datum,utm_zone,area_m2,perimeter_m").eq("id", id).eq("user_id", userId).maybeSingle()
    if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 })
    if (!project.datum || !project.utm_zone) return NextResponse.json({ error: "Datum ou fuso ainda não determinados para este projeto." }, { status: 422 })
    const hemisphere = project.utm_zone.toUpperCase().endsWith("N") ? "N" : "S"
    if (project.datum.toUpperCase().includes("SAD69")) return NextResponse.json({ error: "KML indisponível para SAD69 neste momento" }, { status: 422 })

    const vertices = Array.isArray(project.vertices) ? project.vertices : []
    const kml = buildKml({
      vertices: vertices.map((vertex: { id?: string; name?: string; e?: number; n?: number }) => ({ name: vertex.name ?? vertex.id ?? "Vértice", easting: Number(vertex.e), northing: Number(vertex.n) })),
      datum: project.datum,
      zone: Number.parseInt(project.utm_zone, 10),
      hemisphere,
      metadata: { propertyName: project.name, areaHa: project.area_m2 == null ? null : Number(project.area_m2) / 10000, perimeterM: project.perimeter_m == null ? null : Number(project.perimeter_m) },
    })
    await incrementUsage(userId)
    return new Response(kml, { headers: { "Content-Type": "application/vnd.google-earth.kml+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "projeto"}.kml"` } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar o KML." }, { status: 422 })
  }
}
