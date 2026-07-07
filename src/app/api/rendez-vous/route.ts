import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { checkAutomationKey } from "@/lib/automation";

export const dynamic = "force-dynamic";

// POST /api/rendez-vous — prise de rendez-vous en base depuis l'automatisation WhatsApp.
// Body : { nom_client, telephone, id_produit?, date_rdv?, adresse?, note?, canal? }
export const POST = handler(async (req) => {
  checkAutomationKey(req);
  const {
    nom_client,
    telephone,
    id_produit = null,
    date_rdv = null,
    adresse = null,
    note = null,
    canal = "whatsapp",
  } = (await req.json()) || {};

  if (!nom_client || !telephone) throw new ApiError(422, "nom_client et telephone requis.");

  const emailWa = `${String(telephone).replace(/\D/g, "")}@wa.cleminutes.cm`;
  const [client] = await sql`SELECT id_client FROM utilisateur WHERE email_client = ${emailWa} LIMIT 1`;

  const [rdv] = await sql`
    INSERT INTO rendez_vous (id_client, nom_client, telephone, id_produit, date_rdv, adresse, note, canal, statut)
    VALUES (${client?.id_client ?? null}, ${nom_client}, ${telephone}, ${id_produit},
            ${date_rdv}, ${adresse}, ${note}, ${canal}, ${"demandé"})
    RETURNING *
  `;

  return json(
    {
      success: true,
      id_rdv: rdv.id_rdv,
      message: `Votre rendez-vous est enregistré, ${nom_client}. Nous vous recontactons pour confirmer. 🗓️`,
      rendez_vous: rdv,
    },
    201
  );
});
