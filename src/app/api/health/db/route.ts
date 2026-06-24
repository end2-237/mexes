import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/health/db — diagnostic de connexion Supabase + présence des tables.
// À utiliser pour identifier une 500 (connexion, schéma manquant, etc.).
export async function GET() {
  const hasUrl = Boolean(process.env.DATABASE_URL);
  try {
    const [{ now }] = await sql`SELECT now() AS now`;
    let nbAdmins: number | null = null;
    let tablesOk = true;
    try {
      const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM admin`;
      nbAdmins = count;
    } catch {
      tablesOk = false; // table admin absente → exécuter supabase/schema.sql
    }
    return NextResponse.json({
      ok: true,
      database_url_defini: hasUrl,
      connexion: "réussie",
      heure_serveur: String(now),
      tables_creees: tablesOk,
      nb_admins: nbAdmins,
      conseil: tablesOk
        ? nbAdmins === 0
          ? "Connexion OK mais aucun admin : insérez le premier admin (voir README)."
          : "Connexion OK et admin présent."
        : "Connexion OK mais tables absentes : exécutez supabase/schema.sql + seed.sql.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        database_url_defini: hasUrl,
        connexion: "échouée",
        erreur: e instanceof Error ? e.message : String(e),
        conseil:
          "Vérifiez DATABASE_URL : utilisez la chaîne du POOLER Supabase " +
          "(Transaction pooler, hôte aws-0-...pooler.supabase.com, port 6543) avec le vrai mot de passe.",
      },
      { status: 500 }
    );
  }
}
