export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { hashPassword, generateOtp } from "@/lib/security";

const APP_WEB_URL = process.env.APP_WEB_URL || "https://app.cleminutes.cm";

// POST /api/auth/register — inscription web/mobile (port de auth_unifie.inscription_web)
export const POST = handler(async (req) => {
  const data = await req.json();
  const { nom_client, email_client, password, code_postal = null, canal = "web" } = data || {};

  if (!nom_client || !email_client || !password)
    throw new ApiError(422, "nom_client, email_client et password requis.");
  if (String(password).length < 6)
    throw new ApiError(422, "Mot de passe : minimum 6 caractères");

  const existing = await sql`
    SELECT id_client FROM utilisateur WHERE email_client = ${email_client} LIMIT 1
  `;
  if (existing.length > 0)
    throw new ApiError(400, "Un compte existe déjà avec cet email. Connectez-vous.");

  const pwHache = await hashPassword(password);
  const otp = generateOtp();

  const [user] = await sql`
    INSERT INTO utilisateur (nom_client, email_client, password, code_postal, statut)
    VALUES (${nom_client}, ${email_client}, ${pwHache}, ${code_postal}, ${"en_attente_verification"})
    RETURNING id_client
  `;

  await sql`
    INSERT INTO inscription (id_client, code_otp, liens_app, liens_besoin)
    VALUES (${user.id_client}, ${otp}, ${APP_WEB_URL}, ${APP_WEB_URL + "/aide"})
  `;

  console.log(`📧 INSCRIPTION [${String(canal).toUpperCase()}] ${nom_client} <${email_client}> OTP=${otp}`);

  return json(
    {
      success: true,
      message: "Compte créé ! Vérifiez votre code OTP.",
      otp_demo: otp, // À SUPPRIMER EN PRODUCTION
      prochaine_etape: "POST /api/auth/verify-otp avec votre code OTP",
    },
    201
  );
});
