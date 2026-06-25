import postgres, { type Sql } from "postgres";

/**
 * Client PostgreSQL (Supabase) — port de app/core/database.py
 * ------------------------------------------------------------
 * Connexion PARESSEUSE : le client n'est créé qu'à la première requête,
 * jamais au chargement du module. Cela évite que `next build` (collecte des
 * pages / import des routes) ne tente de parser DATABASE_URL et n'échoue
 * avec "Invalid URL" quand la variable est absente ou mal formée au build.
 *
 * `sql` est un proxy : tout appel (tagged-template ou méthode) initialise
 * le vrai client à la volée puis délègue.
 */

declare global {
  // eslint-disable-next-line no-var
  var __cm_sql: Sql | undefined;
}

function create(): Sql {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.rrgsidmwupvdhpnrqlic:Mexesfranck14@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL non défini — configurez la connexion Supabase dans les variables d'environnement."
    );
  }
  return postgres(connectionString, {
    ssl: connectionString.includes("supabase.co") ? "require" : undefined,
    max: 5,
    idle_timeout: 20,
    prepare: false, // requis pour le pooler Supabase (pgbouncer)
  });
}

function getSql(): Sql {
  if (!global.__cm_sql) {
    global.__cm_sql = create();
  }
  return global.__cm_sql;
}

// Proxy paresseux : se comporte comme l'objet `sql` de postgres (appelable + méthodes),
// mais n'instancie la connexion qu'au premier usage réel (runtime, pas build).
export const sql = new Proxy(function () {} as unknown as Sql, {
  apply(_target, _thisArg, args) {
    // @ts-expect-error délégation du tagged-template / appel direct
    return getSql()(...args);
  },
  get(_target, prop) {
    const value = (getSql() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(getSql()) : value;
  },
}) as Sql;
