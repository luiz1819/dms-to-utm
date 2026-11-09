import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rotas públicas não dependem do Clerk. A autenticação é validada no servidor
// pelas páginas e actions protegidas, evitando que uma configuração ausente do
// provedor derrube o deployment inteiro com MIDDLEWARE_INVOCATION_FAILED.
export default function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
