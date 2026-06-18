import { handler, json, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/admin/commandes?statut=...&limite=... (port de get_toutes_commandes)
export const GET = handler(async (req) => {
  await requireAdmin(req);
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const limite = parseInt(searchParams.get("limite") || "50", 10);

  const commandes = statut
    ? await sql`
        SELECT * FROM commande WHERE statut_cmd = ${statut}
        ORDER BY id_commande DESC LIMIT ${limite}`
    : await sql`SELECT * FROM commande ORDER BY id_commande DESC LIMIT ${limite}`;

  const result = [];
  for (const c of commandes) {
    const [client] = await sql`SELECT * FROM utilisateur WHERE id_client = ${c.id_client} LIMIT 1`;
    const [paiement] = await sql`SELECT * FROM paiement WHERE id_commande = ${c.id_commande} LIMIT 1`;
    const [livraison] = await sql`SELECT * FROM livraison WHERE id_commande = ${c.id_commande} LIMIT 1`;

    result.push({
      id_commande: c.id_commande,
      statut: c.statut_cmd,
      date_paiement: c.date_paiement ? String(c.date_paiement) : null,
      date_livraison: c.date_livraison ? String(c.date_livraison) : null,
      client: {
        id: client?.id_client ?? null,
        nom: client?.nom_client ?? "Inconnu",
        email: client?.email_client ?? "Inconnu",
      },
      paiement: {
        mode: paiement?.mode_paiement ?? null,
        montant: paiement ? Number(paiement.montant) : 0,
        statut: paiement?.statut_transaction ?? null,
      },
      livraison: {
        position_livreur: livraison?.position_livreur ?? null,
        position_client: livraison?.position_client ?? null,
        frais: livraison ? Number(livraison.frais_livraison) : 0,
      },
    });
  }

  return json({ commandes: result, total: result.length });
});
