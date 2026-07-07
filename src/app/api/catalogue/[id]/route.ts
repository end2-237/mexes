import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { checkAutomationKey, produitEnTexte, ProduitRow } from "@/lib/automation";

export const dynamic = "force-dynamic";

// GET /api/catalogue/{id} — infos spécifiques d'un produit (public).
// {id} = ID numérique OU nom de produit (recherche insensible à la casse).
export const GET = handler(async (req, { params }) => {
  checkAutomationKey(req);
  const ref = decodeURIComponent(params!.id);
  const asId = parseInt(ref, 10);

  const rows = (Number.isInteger(asId) && String(asId) === ref
    ? await sql`
        SELECT id_produit, nom_produit, prix_unitaire, categorie, description, photo_url
        FROM produit WHERE id_produit = ${asId} AND actif = TRUE LIMIT 1`
    : await sql`
        SELECT id_produit, nom_produit, prix_unitaire, categorie, description, photo_url
        FROM produit WHERE actif = TRUE AND nom_produit ILIKE ${"%" + ref + "%"}
        ORDER BY id_produit LIMIT 1`) as unknown as ProduitRow[];

  const produit = rows[0];
  if (!produit) throw new ApiError(404, "Produit introuvable dans le catalogue.");

  return json({ success: true, produit, presentation: produitEnTexte(produit) });
});
