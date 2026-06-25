export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { hashPassword, generateOtp } from "@/lib/security";
import { randomBytes } from "crypto";

const APP_WEB_URL = process.env.APP_WEB_URL || "https://app.cleminutes.cm";

// POST /api/auth/register-whatsapp — inscription via le chatbot WhatsApp (port de inscription_whatsapp)
export const POST = handler(async (req) => {
  const { nom_client, email_client, telephone_wa, password_temp } = (await req.json()) || {};
  if (!nom_client || !email_client || !telephone_wa)
    throw new ApiError(422, "nom_client, email_client et telephone_wa requis.");

  const existing = await sql`SELECT id_client FROM utilisateur WHERE email_client = ${email_client} LIMIT 1`;
  if (existing.length > 0) {
    console.log(`📱 Compte existant — lien de connexion à envoyer à ${telephone_wa}`);
    return json({
      success: false,
      message: "Ce compte existe déjà. Lien de connexion envoyé sur WhatsApp.",
      action: "connexion_existant",
    });
  }

  const passwordFinal = password_temp || randomBytes(8).toString("base64url");
  const otp = generateOtp();

  const [user] = await sql`
    INSERT INTO utilisateur (nom_client, email_client, password, statut)
    VALUES (${nom_client}, ${email_client}, ${await hashPassword(passwordFinal)}, ${"en_attente_verification"})
    RETURNING id_client
  `;
  await sql`
    INSERT INTO inscription (id_client, code_otp, liens_app)
    VALUES (${user.id_client}, ${otp}, ${APP_WEB_URL})
  `;
  await sql`
    INSERT INTO chatbot (id_client, canal, service, history_user)
    VALUES (${user.id_client}, ${"whatsapp"}, ${"inscription"},
            ${JSON.stringify([{ role: "system", content: `Client inscrit via WhatsApp. Tel: ${telephone_wa}` }])})
  `;

  console.log(`📱 INSCRIPTION WHATSAPP ${nom_client} (${telephone_wa}) OTP=${otp} pass=${passwordFinal}`);

  return json(
    { success: true, message: "Compte créé ! OTP envoyé sur WhatsApp.", id_client: user.id_client },
    201
  );
});
