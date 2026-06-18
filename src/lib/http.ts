import { NextResponse } from "next/server";
import { verifyToken, JwtPayload } from "./security";

/**
 * Helpers HTTP partagés par les routes API.
 * Reproduit le comportement des HTTPException FastAPI (clé "detail").
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
}

/** Enveloppe une route pour convertir ApiError / erreurs en réponses propres. */
export function handler(
  fn: (req: Request, ctx: { params?: Record<string, string> }) => Promise<NextResponse>
) {
  return async (req: Request, ctx: { params?: Record<string, string> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message);
      console.error("Erreur API:", e);
      return fail(500, "Erreur interne du serveur.");
    }
  };
}

/** Lit le bearer token de l'en-tête Authorization. */
function bearer(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new ApiError(401, "Token invalide ou expiré");
  }
  return token;
}

/** Exige un utilisateur connecté (équivaut à get_current_user). */
export async function requireUser(req: Request): Promise<JwtPayload> {
  const token = bearer(req);
  try {
    const payload = await verifyToken(token);
    return payload;
  } catch {
    throw new ApiError(401, "Token invalide ou expiré");
  }
}

/** Exige un administrateur (équivaut à get_current_admin). */
export async function requireAdmin(req: Request): Promise<JwtPayload> {
  const payload = await requireUser(req);
  if (payload.role !== "admin") {
    throw new ApiError(403, "Accès réservé aux administrateurs.");
  }
  return payload;
}
