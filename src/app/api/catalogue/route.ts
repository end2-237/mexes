import { handler, json } from "@/lib/http";
import { sql } from "@/lib/db";
import { checkAutomationKey, catalogueEnTexte, ProduitRow } from "@/lib/automation";

export const dynamic = "force-dynamic";

// GET /api/catalogue — catalogue actif pour n8n / WhatsApp (public, présentation prête).
// Optionnel : ?categorie=...
export const GET = handler(async (req) => {
  checkAutomationKey(req);
  const { searchParams } = new URL(req.url);
  const categorie = searchParams.get("categorie");

  const produits = (categorie
    ? await sql`
        SELECT id_produit, nom_produit, prix_unitaire, categorie, description, photo_url
        FROM produit WHERE actif = TRUE AND categorie ILIKE ${"%" + categorie + "%"}
        ORDER BY id_produit`
    : await sql`
        SELECT id_produit, nom_produit, prix_unitaire, categorie, description, photo_url
        FROM produit WHERE actif = TRUE ORDER BY id_produit`) as unknown as ProduitRow[];

  return json({
    success: true,
    total: produits.length,
    produits,
    presentation: catalogueEnTexte(produits),
  });
});
