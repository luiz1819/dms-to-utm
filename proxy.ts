import { clerkMiddleware } from "@clerk/nextjs/server"

// Inicializa o contexto do Clerk para que auth() funcione nas páginas e actions
// protegidas. A autorização continua sendo feita explicitamente no servidor.
export default clerkMiddleware()

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
