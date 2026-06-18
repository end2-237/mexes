import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

const MODES = ["MTN Money", "Orange Money", "UBA"];

// POST /api/paiements — enregistre un paiement + reçu (port de creer_paiement)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);
  const { id_commande, mode_paiement, montant } = (await req.json()) || {};

  if (!id_commande || !mode_paiement || montant === undefined)
    throw new ApiError(422, "id_commande, mode_paiement et montant requis.");
  if (!MODES.includes(mode_paiement))
    throw new ApiError(422, `Mode invalide. Choisissez : ${MODES.join(", ")}`);

  const [commande] = await sql`
    SELECT * FROM commande WHERE id_commande = ${id_commande} AND id_client = ${userId} LIMIT 1
  `;
  if (!commande) throw new ApiError(404, "Commande non trouvée.");
  if (commande.statut_cmd !== "En attente")
    throw new ApiError(400, "Cette commande a déjà été payée.");

  const [paiement] = await sql`
    INSERT INTO paiement (id_commande, mode_paiement, montant, statut_transaction)
    VALUES (${id_commande}, ${mode_paiement}, ${montant}, ${"Confirmé"})
    RETURNING *
  `;

  const qr = JSON.stringify({ commande: id_commande, montant, mode: mode_paiement });
  await sql`
    INSERT INTO recu (id_trans, quantite, prix_unitaire, prix_total, qr_code_data)
    VALUES (${paiement.id_trans}, 1, ${montant}, ${montant}, ${qr})
  `;

  await sql`
    UPDATE commande SET statut_cmd = ${"Confirmée"}, date_paiement = now()
    WHERE id_commande = ${id_commande}
  `;

  return json(
    {
      id_trans: paiement.id_trans,
      id_commande: paiement.id_commande,
      mode_paiement: paiement.mode_paiement,
      montant: paiement.montant,
      statut_transaction: paiement.statut_transaction,
      date_transaction: paiement.date_transaction,
    },
    201
  );
});
