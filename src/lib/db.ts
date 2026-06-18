import postgres from "postgres";

/**
 * Client PostgreSQL (Supabase) — port de app/core/database.py
 * ------------------------------------------------------------
 * On utilise la chaîne DATABASE_URL pointant vers Supabase.
 * `sql` est un tagged-template sûr (paramètres échappés) qui remplace
 * les sessions SQLAlchemy du projet FastAPI d'origine.
 *
 * Singleton compatible hot-reload (dev) et serverless (Vercel).
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // On n'interrompt pas l'import (le build Next ne doit pas planter),
  // mais toute requête échouera explicitement.
  console.warn("⚠️  DATABASE_URL non défini — configurez Supabase dans .env.local");
}

declare global {
  // eslint-disable-next-line no-var
  var __cm_sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__cm_sql ??
  postgres(connectionString || "postgres://localhost:5432/postgres", {
    ssl: connectionString?.includes("supabase.co") ? "require" : undefined,
    max: 5,
    idle_timeout: 20,
    prepare: false, // requis pour le pooler Supabase (pgbouncer)
  });

if (process.env.NODE_ENV !== "production") {
  global.__cm_sql = sql;
}
