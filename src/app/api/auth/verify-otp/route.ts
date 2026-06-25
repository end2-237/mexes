export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { createAccessToken } from "@/lib/security";

// POST /api/auth/verify-otp — active le compte + renvoie le JWT (port de verifier_otp)
export const POST = handler(async (req) => {
  const { email_client, code_otp } = (await req.json()) || {};
  if (!email_client || code_otp === undefined)
    throw new ApiError(422, "email_client et code_otp requis.");

  const [user] = await sql`
    SELECT * FROM utilisateur WHERE email_client = ${email_client} LIMIT 1
  `;
  if (!user) throw new ApiError(404, "Email non trouvé.");

  const [inscription] = await sql`
    SELECT * FROM inscription WHERE id_client = ${user.id_client} LIMIT 1
  `;
  if (!inscription || String(inscription.code_otp) !== String(code_otp))
    throw new ApiError(400, "Code invalide.");

  const token = await createAccessToken({
    sub: String(user.id_client),
    email: user.email_client,
    nom: user.nom_client,
    role: "client",
  });

  await sql`UPDATE utilisateur SET statut = ${"actif"} WHERE id_client = ${user.id_client}`;
  await sql`
    UPDATE inscription SET code_otp = NULL, token_jwt = ${token}
    WHERE id_client = ${user.id_client}
  `;

  return json({
    access_token: token,
    token_type: "bearer",
    user: {
      id_client: user.id_client,
      nom_client: user.nom_client,
      email_client: user.email_client,
      statut: "actif",
    },
    canal: "",
  });
});
