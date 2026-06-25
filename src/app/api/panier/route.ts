export const dynamic = "force-dynamic";
import { handler, json, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/panier — récupère ou crée le panier actif (port de get_panier)
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  const userId = parseInt(user.sub, 10);

  let [panier] = await sql`
    SELECT * FROM panier WHERE id_client = ${userId} AND valider_panier = FALSE LIMIT 1
  `;
  if (!panier) {
    [panier] = await sql`
      INSERT INTO panier (id_client, valider_panier) VALUES (${userId}, FALSE) RETURNING *
    `;
  }

  const lignes = await sql`
    SELECT lp.id_ligne, lp.id_panier, lp.quantite,
           p.id_produit, p.nom_produit, p.prix_unitaire, p.categorie, p.adresse
    FROM ligne_panier lp JOIN produit p ON p.id_produit = lp.id_produit
    WHERE lp.id_panier = ${panier.id_panier}
  `;

  return json({
    id_panier: panier.id_panier,
    id_client: panier.id_client,
    valider_panier: panier.valider_panier,
    lignes: lignes.map((l) => ({
      id_ligne: l.id_ligne,
      id_panier: l.id_panier,
      quantite: l.quantite,
      produit: {
        id_produit: l.id_produit,
        nom_produit: l.nom_produit,
        prix_unitaire: l.prix_unitaire,
        categorie: l.categorie,
        adresse: l.adresse,
      },
    })),
  });
});
