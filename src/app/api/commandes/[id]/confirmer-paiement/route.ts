export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";

// POST /api/commandes/{id}/confirmer-paiement (port de livraison.confirmer_paiement)
export const POST = handler(async (_req, { params }) => {
  const id = parseInt(params!.id, 10);
  const [commande] = await sql`SELECT * FROM commande WHERE id_commande = ${id} LIMIT 1`;
  if (!commande) throw new ApiError(404, "Commande non trouvée");

  await sql`UPDATE commande SET statut_cmd = ${"Confirmée"} WHERE id_commande = ${id}`;
  return json({ message: "Paiement validé. Commande prête pour la livraison." });
});
