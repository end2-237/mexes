import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { createAccessToken } from "@/lib/security";

// POST /api/token/refresh — renouvelle l'access token via un refresh token (port de token_manager.py)
export const POST = handler(async (req) => {
  const { refresh_token } = (await req.json()) || {};
  if (!refresh_token) throw new ApiError(422, "refresh_token requis.");

  const [session] = await sql`
    SELECT * FROM sessions_utilisateur
    WHERE refresh_token = ${refresh_token} AND actif = TRUE AND expire_le > now()
    LIMIT 1
  `;
  if (!session) throw new ApiError(401, "Refresh token invalide ou expiré.");

  const [user] = await sql`SELECT * FROM utilisateur WHERE id_client = ${session.id_client} LIMIT 1`;
  if (!user) throw new ApiError(404, "Utilisateur introuvable.");

  const access_token = await createAccessToken({
    sub: String(user.id_client),
    email: user.email_client,
    nom: user.nom_client,
    role: "client",
  });

  return json({ access_token, token_type: "bearer", canal: session.canal });
});
