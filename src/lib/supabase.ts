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
// ── Storage : upload des médias produit ─────────────────────
export const STORAGE_BUCKET = "produits";
 
const TAILLE_MAX_PHOTO = 8 * 1024 * 1024; // 8 Mo
const TAILLE_MAX_VIDEO = 60 * 1024 * 1024; // 60 Mo
 
/**
 * Upload une photo ou une vidéo de produit dans le bucket Storage "produits"
 * et retourne son URL publique. Utilise le client service role (supabaseAdmin)
 * car l'upload se fait toujours depuis une route API admin, jamais du navigateur.
 */
export async function uploadFichierProduit(
  file: File,
  dossier: "photos" | "videos"
): Promise<string> {
  const limite = dossier === "photos" ? TAILLE_MAX_PHOTO : TAILLE_MAX_VIDEO;
  if (file.size > limite) {
    const mo = Math.round(limite / (1024 * 1024));
    throw new Error(`Fichier trop volumineux (max ${mo} Mo).`);
  }
 
  const client = supabaseAdmin();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const nomFichier = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const chemin = `${dossier}/${nomFichier}`;
  const buffer = Buffer.from(await file.arrayBuffer());
 
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(chemin, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
 
  if (error) {
    throw new Error(`Échec de l'upload (${dossier}) : ${error.message}`);
  }
 
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(chemin);
  return data.publicUrl;
}
 
