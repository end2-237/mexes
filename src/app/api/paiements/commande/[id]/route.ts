import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/paiements/commande/{id} — paiement + reçu (port de paiement_commande)
export const GET = handler(async (req, { params }) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);
  const id = parseInt(params!.id, 10);

  const [commande] = await sql`
    SELECT * FROM commande WHERE id_commande = ${id} AND id_client = ${userId} LIMIT 1
  `;
  if (!commande) throw new ApiError(404, "Commande non trouvée.");

  const [paiement] = await sql`SELECT * FROM paiement WHERE id_commande = ${id} LIMIT 1`;
  if (!paiement) throw new ApiError(404, "Aucun paiement pour cette commande.");

  const [recu] = await sql`SELECT * FROM recu WHERE id_trans = ${paiement.id_trans} LIMIT 1`;

  return json({
    paiement: {
      id_trans: paiement.id_trans,
      id_commande: paiement.id_commande,
      mode_paiement: paiement.mode_paiement,
      montant: paiement.montant,
      statut_transaction: paiement.statut_transaction,
      date_transaction: paiement.date_transaction,
    },
    recu: {
      id_recu: recu?.id_recu ?? null,
      prix_total: recu?.prix_total ?? null,
      date_emission: recu?.date_emission ?? null,
      qr_code_data: recu?.qr_code_data ?? null,
    },
  });
});
