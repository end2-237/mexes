import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { verifyPassword, createAccessToken } from "@/lib/security";

// POST /api/auth/login — connexion web/mobile (port de connexion)
export const POST = handler(async (req) => {
  const { email_client, password, canal = "web" } = (await req.json()) || {};
  if (!email_client || !password)
    throw new ApiError(422, "email_client et password requis.");

  const [user] = await sql`
    SELECT * FROM utilisateur WHERE email_client = ${email_client} LIMIT 1
  `;

  const err401 = new ApiError(401, "Email ou mot de passe incorrect.");
  if (!user) throw err401;
  if (!(await verifyPassword(password, user.password))) throw err401;

  if (user.statut === "en_attente_verification")
    throw new ApiError(403, "Compte non activé. Vérifiez votre code OTP d'abord.");
  if (user.statut === "bloqué")
    throw new ApiError(403, "Compte bloqué. Contactez le support.");

  const token = await createAccessToken({
    sub: String(user.id_client),
    email: user.email_client,
    nom: user.nom_client,
    role: "client",
  });

  await sql`
    UPDATE inscription SET token_jwt = ${token} WHERE id_client = ${user.id_client}
  `;

  return json({
    access_token: token,
    token_type: "bearer",
    user: {
      id_client: user.id_client,
      nom_client: user.nom_client,
      email_client: user.email_client,
      statut: user.statut,
    },
    canal,
  });
});
