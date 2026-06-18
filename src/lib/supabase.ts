import { createClient } from "@supabase/supabase-js";

/**
 * Clients Supabase — pour l'auth managée, le storage ou le realtime.
 * La logique métier passe par `sql` (lib/db.ts), mais ces clients sont
 * prêts à l'emploi pour une future intégration (ex: Supabase Auth, Storage).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client public (navigateur / composants) — clé anon.
export const supabase = createClient(url, anonKey);

// Client serveur avec service role (à n'utiliser QUE côté serveur).
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
