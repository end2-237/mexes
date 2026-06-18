import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { randomBytes } from "crypto";

// POST /api/produits/commande — commande client simple sans auth (port de creer_commande_client)
export const POST = handler(async (req) => {
  const { nom, email } = (await req.json()) || {};
  if (!nom || !email) throw new ApiError(422, "nom et email requis.");

  let [user] = await sql`SELECT * FROM utilisateur WHERE email_client = ${email} LIMIT 1`;
  if (!user) {
    const motDePasseTemp = randomBytes(9).toString("base64url");
    [user] = await sql`
      INSERT INTO utilisateur (nom_client, email_client, password, statut)
      VALUES (${nom}, ${email}, ${await hashPassword(motDePasseTemp)}, ${"actif"})
      RETURNING *
    `;
  }

  const [commande] = await sql`
    INSERT INTO commande (id_client, id_panier, statut_cmd)
    VALUES (${user.id_client}, NULL, ${"En attente"})
    RETURNING *
  `;

  return json(
    {
      id_commande: commande.id_commande,
      id_client: commande.id_client,
      statut_commande: commande.statut_cmd,
      date_paiement: commande.date_paiement,
      date_livraison: commande.date_livraison,
    },
    201
  );
});
