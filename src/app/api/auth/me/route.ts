import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/auth/me — profil de l'utilisateur connecté (port de mon_profil)
export const GET = handler(async (req) => {
  const payload = await requireUser(req);
  if (payload.role === "admin")
    throw new ApiError(403, "Utilisez le dashboard admin.");

  const [user] = await sql`
    SELECT * FROM utilisateur WHERE id_client = ${parseInt(payload.sub, 10)} LIMIT 1
  `;
  if (!user) throw new ApiError(404, "Utilisateur introuvable.");

  return json({
    id_client: user.id_client,
    nom_client: user.nom_client,
    email_client: user.email_client,
    statut: user.statut,
    code_postal: user.code_postal,
    token_valide: true,
  });
});
