import { ApiError } from "./http";

/**
 * Helpers pour les routes consommées par l'automatisation n8n / WhatsApp.
 * Protection optionnelle : si AUTOMATION_API_KEY est défini, l'en-tête
 * `x-api-key` est exigé. Sinon les routes restent ouvertes (intégration).
 */
export function checkAutomationKey(req: Request): void {
  const expected = process.env.AUTOMATION_API_KEY;
  if (!expected) return;
  const provided = req.headers.get("x-api-key");
  if (provided !== expected) throw new ApiError(401, "Clé d'automatisation invalide.");
}

export type ProduitRow = {
  id_produit: number;
  nom_produit: string;
  prix_unitaire: string | number;
  categorie: string | null;
  description?: string | null;
  photo_url?: string | null;
};

export function prixXAF(v: string | number): string {
  return `${Number(v).toLocaleString("fr-CM")} FCFA`;
}

/** Texte WhatsApp d'un produit unique. */
export function produitEnTexte(p: ProduitRow): string {
  return (
    `🔑 *${p.nom_produit}*\n` +
    `💰 ${prixXAF(p.prix_unitaire)}\n` +
    (p.categorie ? `📂 ${p.categorie}\n` : "") +
    (p.description ? `\n${p.description}\n` : "")
  );
}

/** Texte WhatsApp du catalogue complet. */
export function catalogueEnTexte(produits: ProduitRow[]): string {
  if (produits.length === 0) return "Notre catalogue est momentanément vide. Revenez bientôt ! 🔑";
  const lignes = produits
    .map((p, i) => `${i + 1}. *${p.nom_produit}* — ${prixXAF(p.prix_unitaire)}`)
    .join("\n");
  return (
    `🔑 *Catalogue Clé Minutes*\n\n${lignes}\n\n` +
    `Répondez avec le *nom* ou le *numéro* d'un article pour plus de détails, ` +
    `ou dites *"commander"* pour passer commande.`
  );
}
