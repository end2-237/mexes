export const dynamic = "force-dynamic";
import { handler, json, ApiError, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";

const STATUTS = ["En attente", "Confirmée", "En livraison", "Livrée", "Annulée"];

// PUT /api/admin/commandes/{id} — mise à jour du statut (port de update_statut_commande)
export const PUT = handler(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = parseInt(params!.id, 10);
  const { statut_cmd, commentaire } = (await req.json()) || {};

  if (!STATUTS.includes(statut_cmd))
    throw new ApiError(400, `Statut invalide. Choisissez : ${STATUTS.join(", ")}`);

  const [commande] = await sql`SELECT * FROM commande WHERE id_commande = ${id} LIMIT 1`;
  if (!commande) throw new ApiError(404, "Commande introuvable.");

  const ancienStatut = commande.statut_cmd;

  if (statut_cmd === "Livrée") {
    await sql`UPDATE commande SET statut_cmd = ${statut_cmd}, date_livraison = now() WHERE id_commande = ${id}`;
  } else {
    await sql`UPDATE commande SET statut_cmd = ${statut_cmd} WHERE id_commande = ${id}`;
  }

  const horodatage = new Date().toLocaleString("fr-FR");
  const decision =
    `[${horodatage}] Commande #${id} : ${ancienStatut} → ${statut_cmd}` +
    (commentaire ? ` | ${commentaire}` : "");
  await sql`UPDATE admin SET decision = ${decision} WHERE id_admin = ${parseInt(admin.sub, 10)}`;

  return json({
    success: true,
    message: `Commande #${id} mise à jour : ${ancienStatut} → ${statut_cmd}`,
    notification_client: "Envoi en cours...",
  });
});
