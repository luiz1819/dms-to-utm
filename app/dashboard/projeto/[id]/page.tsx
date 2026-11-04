import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { formatDate, statusLabels, type ProjectStatus } from "@/lib/format"
import { ProjectView, type Vertex } from "@/components/dashboard/project-view"
import { SetupNotice } from "@/components/setup-notice"

export const metadata: Metadata = { title: "Projeto — TopoCAD" }

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params

  if (!isSupabaseConfigured()) {
    return <SetupNotice variables={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]} />
  }

  const supabase = createServerClient()
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, utm_zone, datum, hemisphere, vertices, area_m2, perimeter_m, created_at")
    .eq("id", id)
    .maybeSingle()

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Projetos
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold text-zinc-100">{project.name}</h1>
        <p className="text-sm text-zinc-500">
          {statusLabels[project.status as ProjectStatus] ?? project.status} · criado em {formatDate(project.created_at)}
        </p>
      </div>
      <ProjectView
        initialProjectId={project.id}
        initialVertices={Array.isArray(project.vertices) ? (project.vertices as Vertex[]) : []}
        initialZone={project.utm_zone}
        initialDatum={project.datum}
      />
    </div>
  )
}
