import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluimos sw.js y manifest.webmanifest porque Chrome los pide sin sesión
    // al evaluar la instalabilidad de la PWA. Si el proxy los redirige a
    // /login, Chrome ve respuestas inválidas y deja de ofrecer "Instalar".
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
