import { NextRequest, NextResponse } from "next/server";

/**
 * MULTI-HOSTING / MULTI-ZONE — Vercel
 * ===================================================================
 * Le projet héberge DEUX zones dans une seule base de code :
 *
 *   1. La VITRINE (site marketing)  → domaine racine        ex: cleminutes.cm
 *   2. Le DASHBOARD (admin/console) → sous-domaine "app"     ex: app.cleminutes.cm
 *
 * Le middleware réécrit l'URL en fonction du hostname pour que chaque
 * domaine serve la bonne zone, sans dupliquer le déploiement.
 *
 * Configuration via variables d'environnement (Vercel) :
 *   NEXT_PUBLIC_ROOT_DOMAIN      ex: "cleminutes.cm"
 *   NEXT_PUBLIC_DASHBOARD_HOST   ex: "app.cleminutes.cm" (sous-domaine du dashboard)
 *
 * En local / preview, on peut forcer le dashboard via le préfixe /dashboard.
 * ===================================================================
 */

const DASHBOARD_HOST = process.env.NEXT_PUBLIC_DASHBOARD_HOST || "app.localhost:3000";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = (req.headers.get("host") || "").toLowerCase();
  const path = url.pathname;

  // Les routes API et les assets internes ne sont jamais réécrits.
  if (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/dashboard") ||
    path.includes(".") // fichiers statiques (favicon, images...)
  ) {
    return NextResponse.next();
  }

  // Le sous-domaine du dashboard (ou un host "app.*") sert la zone dashboard.
  const isDashboardHost =
    hostname === DASHBOARD_HOST || hostname.startsWith("app.");

  if (isDashboardHost) {
    return NextResponse.rewrite(new URL(`/dashboard${path === "/" ? "" : path}`, req.url));
  }

  // Sinon : domaine racine → zone vitrine (servie par le groupe (site)).
  return NextResponse.next();
}

export const config = {
  // On exécute le middleware sur toutes les routes sauf les assets internes Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
