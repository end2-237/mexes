export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/produits/{id} — détail produit (port de detail_produit)
export const GET = handler(async (_req, { params }) => {
  const id = parseInt(params!.id, 10);
  const [produit] = await sql`SELECT * FROM produit WHERE id_produit = ${id} LIMIT 1`;
  if (!produit) throw new ApiError(404, "Produit non trouvé.");
  return json(produit);
});
