export const dynamic = "force-dynamic";
import { handler, json, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/admin/clients — liste des clients (port de get_tous_clients)
export const GET = handler(async (req) => {
  await requireAdmin(req);
  const clients = await sql`SELECT * FROM utilisateur ORDER BY id_client DESC`;

  const result = [];
  for (const client of clients) {
    const [{ count: nbCommandes }] = await sql`
      SELECT COUNT(*)::int AS count FROM commande WHERE id_client = ${client.id_client}
    `;
    const [canal] = await sql`
      SELECT canal FROM chatbot WHERE id_client = ${client.id_client}
      ORDER BY date_session DESC LIMIT 1
    `;
    result.push({
      id_client: client.id_client,
      nom: client.nom_client,
      email: client.email_client,
      statut: client.statut,
      code_postal: client.code_postal,
      nb_commandes: nbCommandes,
      canal: canal?.canal ?? "web",
    });
  }

  return json({ clients: result, total: result.length });
});
