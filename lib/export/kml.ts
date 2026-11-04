import proj4 from "proj4"

export type KmlVertex = { name: string; easting: number; northing: number }

export type KmlInput = {
  vertices: KmlVertex[]
  datum: string
  zone: number
  hemisphere: "N" | "S"
  metadata: { propertyName: string; municipality?: string | null; areaHa?: number | null; perimeterM?: number | null }
}

function escapeXml(value: string) {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[character] ?? character)
}

function toLonLat(vertex: KmlVertex, zone: number, hemisphere: "N" | "S") {
  const latitudeBand = hemisphere === "S" ? "+south" : ""
  const [longitude, latitude] = proj4(`+proj=utm +zone=${zone} +datum=WGS84 ${latitudeBand}`, "+proj=longlat +datum=WGS84", [vertex.easting, vertex.northing])
  if (latitude < -34 || latitude > 6 || longitude < -74 || longitude > -34) {
    throw new Error("Coordenadas fora do Brasil, confira datum e fuso.")
  }
  return { longitude, latitude }
}

function coordinate(point: { longitude: number; latitude: number }) {
  return `${point.longitude.toFixed(8)},${point.latitude.toFixed(8)},0`
}

export function buildKml(input: KmlInput) {
  if (input.datum.toUpperCase().includes("SAD69")) throw new Error("KML indisponível para SAD69 neste momento")
  if (input.vertices.length < 3) throw new Error("São necessários pelo menos três vértices para gerar o KML.")

  const points = input.vertices.map((vertex) => toLonLat(vertex, input.zone, input.hemisphere))
  const polygonCoordinates = [...points, points[0]].map(coordinate).join(" ")
  const vertexPlacemarks = input.vertices.map((vertex, index) => `<Placemark><name>${escapeXml(vertex.name)}</name><Point><coordinates>${coordinate(points[index])}</coordinates></Point></Placemark>`).join("")
  const extendedData = [
    ["Município", input.metadata.municipality],
    ["Área (ha)", input.metadata.areaHa == null ? null : input.metadata.areaHa.toFixed(4)],
    ["Perímetro (m)", input.metadata.perimeterM == null ? null : input.metadata.perimeterM.toFixed(2)],
  ].filter(([, value]) => value != null).map(([name, value]) => `<Data name="${escapeXml(String(name ?? ""))}"><value>${escapeXml(String(value ?? ""))}</value></Data>`).join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${escapeXml(input.metadata.propertyName)}</name><Style id="contorno"><LineStyle><color>ff3b82f6</color><width>3</width></LineStyle><PolyStyle><color>663b82f6</color></PolyStyle></Style><Placemark><name>${escapeXml(input.metadata.propertyName)}</name><ExtendedData>${extendedData}</ExtendedData><styleUrl>#contorno</styleUrl><Polygon><outerBoundaryIs><LinearRing><coordinates>${polygonCoordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark><Folder><name>Vértices</name>${vertexPlacemarks}</Folder></Document></kml>`
}
