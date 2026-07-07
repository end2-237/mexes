import { handler, json, ApiError, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/produits/:id/stock — historique des mouvements de stock
export const GET = handler(async (req, ctx) => {
  await requireAdmin(req);
  const idProduit = Number(ctx.params?.id);

  const mouvements = await sql`
    SELECT id_mouvement, type_mouvement, quantite, motif, stock_apres, date_mouvement
    FROM mouvement_stock
    WHERE id_produit = ${idProduit}
    ORDER BY date_mouvement DESC
    LIMIT 50
  `;

  return json({ mouvements });
});

// POST /api/admin/produits/:id/stock — enregistrer un mouvement (entrée / sortie / ajustement)
// Body : { type_mouvement: "entree"|"sortie"|"ajustement", quantite, motif? }
export const POST = handler(async (req, ctx) => {
  await requireAdmin(req);
  const idProduit = Number(ctx.params?.id);
  const { type_mouvement, quantite, motif = null } = (await req.json()) || {};

  if (!["entree", "sortie", "ajustement"].includes(type_mouvement))
    throw new ApiError(400, "type_mouvement invalide (entree | sortie | ajustement).");
  const q = Number(quantite);
  if (!q || q <= 0) throw new ApiError(400, "quantite invalide.");

  const [produit] = await sql`SELECT stock_actuel FROM produit WHERE id_produit = ${idProduit}`;
  if (!produit) throw new ApiError(404, "Produit introuvable.");

  const actuel = Number(produit.stock_actuel) || 0;
  let nouveau: number;
  if (type_mouvement === "entree") nouveau = actuel + q;
  else if (type_mouvement === "sortie") nouveau = actuel - q;
  else nouveau = q; // ajustement : valeur absolue

  if (nouveau < 0) throw new ApiError(400, "Stock insuffisant pour cette sortie.");

  await sql`UPDATE produit SET stock_actuel = ${nouveau} WHERE id_produit = ${idProduit}`;
  const [mouvement] = await sql`
    INSERT INTO mouvement_stock (id_produit, type_mouvement, quantite, motif, stock_apres, cree_par)
    VALUES (${idProduit}, ${type_mouvement}, ${q}, ${motif}, ${nouveau}, 'admin')
    RETURNING *
  `;

  return json({ stock_actuel: nouveau, mouvement });
});
