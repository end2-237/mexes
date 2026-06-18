import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/commandes/{id} — détail d'une commande de l'utilisateur (port de detail_commande)
export const GET = handler(async (req, { params }) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);
  const id = parseInt(params!.id, 10);

  const [commande] = await sql`
    SELECT * FROM commande WHERE id_commande = ${id} AND id_client = ${userId} LIMIT 1
  `;
  if (!commande) throw new ApiError(404, "Commande non trouvée.");

  return json({
    id_commande: commande.id_commande,
    id_client: commande.id_client,
    statut_commande: commande.statut_cmd,
    date_paiement: commande.date_paiement,
    date_livraison: commande.date_livraison,
  });
});
