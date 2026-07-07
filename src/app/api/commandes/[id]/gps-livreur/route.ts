export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";

// PATCH /api/commandes/{id}/gps-livreur — position du livreur (port de mettre_a_jour_gps_livreur)
export const PATCH = handler(async (req, { params }) => {
  const id = parseInt(params!.id, 10);
  const { latitude_livreur, longitude_livreur } = (await req.json()) || {};

  const [commande] = await sql`SELECT * FROM commande WHERE id_commande = ${id} LIMIT 1`;
  if (!commande) throw new ApiError(404, "Commande non trouvée");

  const position = `${latitude_livreur},${longitude_livreur}`;
  const [livraison] = await sql`SELECT * FROM livraison WHERE id_commande = ${id} LIMIT 1`;
  if (livraison) {
    await sql`UPDATE livraison SET position_livreur = ${position} WHERE id_commande = ${id}`;
  } else {
    await sql`INSERT INTO livraison (id_commande, position_livreur) VALUES (${id}, ${position})`;
  }

  return json({ status: "Position mise à jour" });
});
