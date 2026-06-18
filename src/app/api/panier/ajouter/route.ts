import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// POST /api/panier/ajouter — ajoute un produit au panier (port de ajouter_au_panier)
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);
  const { id_produit, quantite = 1 } = (await req.json()) || {};
  if (!id_produit) throw new ApiError(422, "id_produit requis.");
  if (quantite <= 0) throw new ApiError(422, "La quantité doit être supérieure à 0");

  const [produit] = await sql`SELECT * FROM produit WHERE id_produit = ${id_produit} LIMIT 1`;
  if (!produit) throw new ApiError(404, "Produit non trouvé.");

  let [panier] = await sql`
    SELECT * FROM panier WHERE id_client = ${userId} AND valider_panier = FALSE LIMIT 1
  `;
  if (!panier) {
    [panier] = await sql`
      INSERT INTO panier (id_client, valider_panier) VALUES (${userId}, FALSE) RETURNING *
    `;
  }

  const [ligneExistante] = await sql`
    SELECT * FROM ligne_panier
    WHERE id_panier = ${panier.id_panier} AND id_produit = ${id_produit} LIMIT 1
  `;

  if (ligneExistante) {
    await sql`
      UPDATE ligne_panier SET quantite = quantite + ${quantite}
      WHERE id_ligne = ${ligneExistante.id_ligne}
    `;
  } else {
    await sql`
      INSERT INTO ligne_panier (id_panier, id_produit, quantite)
      VALUES (${panier.id_panier}, ${id_produit}, ${quantite})
    `;
  }

  return json({ message: `✅ ${produit.nom_produit} ajouté au panier.`, success: true });
});
