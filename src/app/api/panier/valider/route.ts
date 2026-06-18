import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// POST /api/panier/valider — valide le panier et crée une commande (port de valider_panier)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);

  const [panier] = await sql`
    SELECT * FROM panier WHERE id_client = ${userId} AND valider_panier = FALSE LIMIT 1
  `;
  if (!panier) throw new ApiError(404, "Aucun panier actif.");

  const lignes = await sql`SELECT id_ligne FROM ligne_panier WHERE id_panier = ${panier.id_panier}`;
  if (lignes.length === 0) throw new ApiError(400, "Le panier est vide.");

  await sql`UPDATE panier SET valider_panier = TRUE WHERE id_panier = ${panier.id_panier}`;

  const [commande] = await sql`
    INSERT INTO commande (id_client, id_panier, statut_cmd)
    VALUES (${userId}, ${panier.id_panier}, ${"En attente"})
    RETURNING *
  `;

  return json({
    id_commande: commande.id_commande,
    id_client: commande.id_client,
    statut_commande: commande.statut_cmd,
    date_paiement: commande.date_paiement,
    date_livraison: commande.date_livraison,
  });
});
