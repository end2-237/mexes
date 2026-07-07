import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { hashPassword, generateOtp } from "@/lib/security";
import { checkAutomationKey } from "@/lib/automation";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const APP_WEB_URL = process.env.APP_WEB_URL || "https://app.cleminutes.cm";

// POST /api/inscription — inscription simplifiée pour l'automatisation WhatsApp (n8n).
// Body : { nom_client, telephone?, email_client?, code_postal?, canal? }
export const POST = handler(async (req) => {
  checkAutomationKey(req);
  const {
    nom_client,
    telephone = null,
    email_client = null,
    code_postal = null,
    canal = "whatsapp",
  } = (await req.json()) || {};

  if (!nom_client || (!email_client && !telephone))
    throw new ApiError(422, "nom_client requis, plus email_client OU telephone.");

  const email = email_client || `${String(telephone).replace(/\D/g, "")}@wa.cleminutes.cm`;

  const existing = await sql`
    SELECT id_client, nom_client FROM utilisateur WHERE email_client = ${email} LIMIT 1
  `;
  if (existing.length > 0) {
    return json({
      success: true,
      deja_inscrit: true,
      id_client: existing[0].id_client,
      message: `Vous êtes déjà inscrit, ${existing[0].nom_client}. Bienvenue à nouveau ! 🔑`,
    });
  }

  const passwordTemp = randomBytes(6).toString("base64url");
  const otp = generateOtp();

  const [user] = await sql`
    INSERT INTO utilisateur (nom_client, email_client, password, code_postal, statut)
    VALUES (${nom_client}, ${email}, ${await hashPassword(passwordTemp)}, ${code_postal}, ${"actif"})
    RETURNING id_client
  `;
  await sql`
    INSERT INTO inscription (id_client, code_otp, liens_app)
    VALUES (${user.id_client}, ${otp}, ${APP_WEB_URL})
  `;
  await sql`
    INSERT INTO chatbot (id_client, canal, service)
    VALUES (${user.id_client}, ${canal}, ${"inscription"})
  `;

  return json(
    {
      success: true,
      deja_inscrit: false,
      id_client: user.id_client,
      email,
      message: `Bienvenue chez Clé Minutes, ${nom_client} ! Votre inscription est confirmée. 🔑`,
    },
    201
  );
});
