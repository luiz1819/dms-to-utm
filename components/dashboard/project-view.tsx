"use client"

import { useMemo, useState } from "react"
import { Download, Map as MapIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatArea, formatLength } from "@/lib/format"

export type Vertex = {
  id: string
  e: number | null
  n: number | null
  azimuth?: string | null
  distance?: number | null
}

const zones = ["18S", "19S", "20S", "21S", "22S", "23S", "24S", "25S"]

function computeMetrics(vertices: Vertex[]) {
  const points = vertices.filter((v): v is Vertex & { e: number; n: number } => v.e !== null && v.n !== null)
  if (points.length < 3) return null

  let twiceArea = 0
  let perimeter = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    twiceArea += a.e * b.n - b.e * a.n
    perimeter += Math.hypot(b.e - a.e, b.n - a.n)
  }
  const first = points[0]
  const last = points[points.length - 1]
  return { area: Math.abs(twiceArea) / 2, perimeter, closure: Math.hypot(last.e - first.e, last.n - first.n), points }
}

function PolygonPreview({ points }: { points: { e: number; n: number }[] }) {
  const minE = Math.min(...points.map((p) => p.e))
  const maxE = Math.max(...points.map((p) => p.e))
  const minN = Math.min(...points.map((p) => p.n))
  const maxN = Math.max(...points.map((p) => p.n))
  const span = Math.max(maxE - minE, maxN - minN) || 1
  const pad = 20
  const size = 400
  const scale = (size - pad * 2) / span
  const toXY = (p: { e: number; n: number }) => [pad + (p.e - minE) * scale, size - pad - (p.n - minN) * scale]
  const path = points.map((p) => toXY(p).join(",")).join(" ")

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pré-visualização do polígono" className="w-full max-h-[420px]">
      <polygon points={path} className="fill-zinc-100/10 stroke-zinc-100" strokeWidth={1.5} />
      {points.map((p, i) => {
        const [x, y] = toXY(p)
        return <circle key={i} cx={x} cy={y} r={3} className="fill-zinc-100" />
      })}
    </svg>
  )
}

export function ProjectView({
  initialProjectId,
  initialVertices,
  initialZone,
  initialDatum,
}: {
  initialProjectId: string
  initialVertices: Vertex[]
  initialZone: string | null
  initialDatum: string | null
}) {
  const [vertices, setVertices] = useState(initialVertices)
  const [isDownloadingKml, setIsDownloadingKml] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [zone, setZone] = useState(initialZone ?? "23S")
  const [datum, setDatum] = useState(initialDatum ?? "SIRGAS2000")
  const metrics = useMemo(() => computeMetrics(vertices), [vertices])

  function updateVertex(index: number, field: "e" | "n", value: string) {
    const parsed = value === "" ? null : Number(value.replace(",", "."))
    setVertices((current) =>
      current.map((v, i) => (i === index ? { ...v, [field]: Number.isFinite(parsed) ? parsed : v[field] } : v)),
    )
  }

  return (
    <Tabs defaultValue="dados" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-2">
          {["XLSX", "DXF"].map((format) => (
            <button key={format} type="button" disabled title="Em breve" className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60">
              <Download className="h-4 w-4" aria-hidden="true" />
              {format} <span className="text-xs text-zinc-600">Em breve</span>
            </button>
          ))}
          <button
            type="button"
            disabled={isDownloadingKml || vertices.length < 3 || !initialZone || !initialDatum || initialDatum.toUpperCase().includes("SAD69")}
            title={initialDatum?.toUpperCase().includes("SAD69") ? "KML indisponível para SAD69 neste momento" : !initialZone || !initialDatum ? "Datum e fuso ainda não determinados" : "Baixar KML"}
            onClick={async () => {
              setIsDownloadingKml(true)
              setDownloadError(null)
              try {
                const response = await fetch(`/api/projetos/${initialProjectId}/export/kml`)
                if (!response.ok) throw new Error((await response.json()).error ?? "Não foi possível gerar o KML.")
                const blob = await response.blob()
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement("a")
                anchor.href = url
                anchor.download = `${initialProjectId}.kml`
                anchor.click()
                URL.revokeObjectURL(url)
              } catch (error) {
                setDownloadError(error instanceof Error ? error.message : "Não foi possível gerar o KML.")
              } finally {
                setIsDownloadingKml(false)
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            KML
          </button>
        </div>
      </div>

      {downloadError ? <p role="alert" className="text-sm text-red-400">{downloadError}</p> : null}
      <TabsContent value="dados" className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-zinc-800/50 overflow-hidden">
          {vertices.length === 0 ? (
            <p className="p-10 text-center text-sm text-zinc-500">
              Os vértices aparecerão aqui assim que o memorial for processado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500">Vértice</TableHead>
                  <TableHead className="text-zinc-500">E (m)</TableHead>
                  <TableHead className="text-zinc-500">N (m)</TableHead>
                  <TableHead className="text-zinc-500">Azimute</TableHead>
                  <TableHead className="text-zinc-500">Distância</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vertices.map((vertex, index) => (
                  <TableRow key={`${vertex.id}-${index}`} className="border-zinc-800/60">
                    <TableCell className="font-mono text-zinc-200">{vertex.id}</TableCell>
                    {(["e", "n"] as const).map((field) => (
                      <TableCell key={field}>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={vertex[field] ?? ""}
                          onBlur={(event) => updateVertex(index, field, event.target.value)}
                          aria-label={`${field.toUpperCase()} do vértice ${vertex.id}`}
                          className="w-32 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-sm text-zinc-100"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="font-mono text-zinc-400">{vertex.azimuth ?? "—"}</TableCell>
                    <TableCell className="text-zinc-400">{formatLength(vertex.distance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <aside className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5 space-y-4 h-fit">
          <h2 className="text-sm font-medium text-zinc-300">Parâmetros</h2>
          <div className="space-y-2">
            <Label htmlFor="zone" className="text-zinc-400">
              Fuso UTM
            </Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger id="zone" className="w-full bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="datum" className="text-zinc-400">
              Datum
            </Label>
            <Select value={datum} onValueChange={setDatum}>
              <SelectTrigger id="datum" className="w-full bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIRGAS2000">SIRGAS 2000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </aside>
      </TabsContent>

      <TabsContent value="mapa" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Área", value: metrics ? formatArea(metrics.area) : "—" },
            { label: "Perímetro", value: metrics ? formatLength(metrics.perimeter) : "—" },
            { label: "Erro de fechamento", value: metrics ? formatLength(metrics.closure) : "—" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5">
              <p className="text-sm text-zinc-500">{card.label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-zinc-100">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6 flex items-center justify-center min-h-[320px]">
          {metrics ? (
            <PolygonPreview points={metrics.points} />
          ) : (
            <div className="text-center">
              <MapIcon className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-500">Pré-visualização 2D disponível após o processamento.</p>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
