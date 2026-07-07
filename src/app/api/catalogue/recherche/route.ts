import { handler, json } from "@/lib/http";
import { sql } from "@/lib/db";
import { checkAutomationKey, produitEnTexte, prixXAF, ProduitRow } from "@/lib/automation";

export const dynamic = "force-dynamic";

// GET /api/catalogue/recherche?q=... — vérifie/recherche un produit en base (public).
export const GET = handler(async (req) => {
  checkAutomationKey(req);
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) return json({ success: true, existe: false, total: 0, produits: [], presentation: "" });

  const produits = (await sql`
    SELECT id_produit, nom_produit, prix_unitaire, categorie, description, photo_url
    FROM produit
    WHERE actif = TRUE AND (nom_produit ILIKE ${"%" + q + "%"} OR categorie ILIKE ${"%" + q + "%"})
    ORDER BY id_produit LIMIT 10
  `) as unknown as ProduitRow[];

  const presentation =
    produits.length === 0
      ? `Désolé, je n'ai trouvé aucun produit correspondant à « ${q} ». Dites *"catalogue"* pour voir toute notre offre. 🔑`
      : produits.length === 1
        ? produitEnTexte(produits[0])
        : "Voici ce que j'ai trouvé :\n\n" +
          produits.map((p, i) => `${i + 1}. *${p.nom_produit}* — ${prixXAF(p.prix_unitaire)}`).join("\n");

  return json({ success: true, existe: produits.length > 0, total: produits.length, produits, presentation });
});
