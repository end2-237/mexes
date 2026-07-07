import { handler, json, ApiError, requireAdmin } from "@/lib/http";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/admin/produits/signed-upload — renvoie une URL d'upload signée Supabase.
// Le navigateur envoie ensuite le fichier DIRECTEMENT à Supabase Storage,
// ce qui contourne la limite de 4,5 Mo des fonctions serverless Vercel.
// Body : { dossier: "photos" | "videos", filename }
export const POST = handler(async (req) => {
  await requireAdmin(req);
  const { dossier, filename } = (await req.json()) || {};

  if (dossier !== "photos" && dossier !== "videos")
    throw new ApiError(400, 'dossier invalide (attendu "photos" ou "videos").');

  const ext = (String(filename || "bin").split(".").pop() || "bin").toLowerCase();
  const chemin = `${dossier}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  const client = supabaseAdmin();
  const { data, error } = await client.storage.from(STORAGE_BUCKET).createSignedUploadUrl(chemin);
  if (error) throw new ApiError(500, `Impossible de préparer l'upload : ${error.message}`);

  const { data: pub } = client.storage.from(STORAGE_BUCKET).getPublicUrl(chemin);

  return json({
    path: chemin,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: pub.publicUrl,
  });
});
