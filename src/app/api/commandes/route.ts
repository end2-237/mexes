import { handler, json, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/commandes — commandes de l'utilisateur connecté (port de mes_commandes)
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);

  const commandes = await sql`
    SELECT * FROM commande WHERE id_client = ${userId} ORDER BY id_commande DESC
  `;

  return json(
    commandes.map((c) => ({
      id_commande: c.id_commande,
      id_client: c.id_client,
      statut_commande: c.statut_cmd,
      date_paiement: c.date_paiement,
      date_livraison: c.date_livraison,
    }))
  );
});
