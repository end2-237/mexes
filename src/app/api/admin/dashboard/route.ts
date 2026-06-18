import { handler, json, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";

const STATUTS = ["En attente", "Confirmée", "En livraison", "Livrée", "Annulée"];

// GET /api/admin/dashboard — statistiques globales (port de get_dashboard)
export const GET = handler(async (req) => {
  await requireAdmin(req);

  const [{ count: totalClients }] = await sql`SELECT COUNT(*)::int AS count FROM utilisateur`;
  const [{ count: clientsActifs }] =
    await sql`SELECT COUNT(*)::int AS count FROM utilisateur WHERE statut = 'actif'`;
  const [{ count: totalCommandes }] = await sql`SELECT COUNT(*)::int AS count FROM commande`;

  const parStatut: Record<string, number> = {};
  for (const statut of STATUTS) {
    const [{ count }] =
      await sql`SELECT COUNT(*)::int AS count FROM commande WHERE statut_cmd = ${statut}`;
    parStatut[statut] = count;
  }

  const [{ total: caTotal }] = await sql`
    SELECT COALESCE(SUM(montant), 0)::float AS total FROM paiement WHERE statut_transaction = 'Confirmé'
  `;
  const [{ total: caSemaine }] = await sql`
    SELECT COALESCE(SUM(montant), 0)::float AS total FROM paiement
    WHERE statut_transaction = 'Confirmé' AND date_transaction >= now() - interval '7 days'
  `;

  const [{ count: alertesCritiques }] = await sql`
    SELECT COUNT(*)::int AS count FROM logs_requetes WHERE danger IN ('élevé', 'bloqué')
  `;
  const alertesRecentes = await sql`
    SELECT id_req, address_ip, danger, times, details FROM logs_requetes
    ORDER BY times DESC LIMIT 5
  `;

  const dernieresCommandes = await sql`
    SELECT id_commande, id_client, statut_cmd, date_paiement FROM commande
    ORDER BY id_commande DESC LIMIT 5
  `;

  const [{ count: sessionsChatbot }] = await sql`SELECT COUNT(*)::int AS count FROM chatbot`;
  const [{ count: sessionsWhatsapp }] =
    await sql`SELECT COUNT(*)::int AS count FROM chatbot WHERE canal = 'whatsapp'`;

  return json({
    clients: { total: totalClients, actifs: clientsActifs, nouveaux_7j: clientsActifs },
    commandes: {
      total: totalCommandes,
      par_statut: parStatut,
      en_attente: parStatut["En attente"] || 0,
    },
    finances: { ca_total_xaf: caTotal, ca_7j_xaf: caSemaine },
    securite: {
      alertes_critiques: alertesCritiques,
      dernieres_alertes: alertesRecentes.map((a) => ({
        id: a.id_req,
        ip: a.address_ip ? String(a.address_ip) : "Inconnue",
        niveau: a.danger,
        heure: String(a.times),
        details: a.details,
      })),
    },
    commandes_recentes: dernieresCommandes.map((c) => ({
      id: c.id_commande,
      client: c.id_client,
      statut: c.statut_cmd,
      date: String(c.date_paiement),
    })),
    chatbot: {
      total_sessions: sessionsChatbot,
      sessions_whatsapp: sessionsWhatsapp,
      sessions_web: sessionsChatbot - sessionsWhatsapp,
    },
  });
});
