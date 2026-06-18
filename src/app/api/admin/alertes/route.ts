import { handler, json, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/admin/alertes?niveau=...&limite=... (port de get_alertes_securite)
export const GET = handler(async (req) => {
  await requireAdmin(req);
  const { searchParams } = new URL(req.url);
  const niveau = searchParams.get("niveau");
  const limite = parseInt(searchParams.get("limite") || "100", 10);

  const alertes = niveau
    ? await sql`
        SELECT * FROM logs_requetes WHERE danger = ${niveau}
        ORDER BY times DESC LIMIT ${limite}`
    : await sql`
        SELECT * FROM logs_requetes WHERE danger IN ('moyen', 'élevé', 'bloqué')
        ORDER BY times DESC LIMIT ${limite}`;

  return json({
    alertes: alertes.map((a) => {
      let details: unknown = {};
      try {
        details = a.details ? JSON.parse(a.details) : {};
      } catch {
        details = a.details;
      }
      return {
        id: a.id_req,
        ip: a.address_ip ? String(a.address_ip) : "Inconnue",
        niveau: a.danger,
        heure: String(a.times),
        redis_key: a.redis_key,
        details,
      };
    }),
    total: alertes.length,
  });
});
