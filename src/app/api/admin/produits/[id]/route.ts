import { handler, json, ApiError, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";
import { uploadFichierProduit } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/admin/produits/:id — détail d'un produit
export const GET = handler(async (req, ctx) => {
  await requireAdmin(req);
  const idProduit = Number(ctx.params?.id);

  const [produit] = await sql`SELECT * FROM produit WHERE id_produit = ${idProduit}`;
  if (!produit) throw new ApiError(404, "Produit introuvable.");

  return json({ produit });
});

// PUT /api/admin/produits/:id — mise à jour (JSON ou multipart si nouvelle photo/vidéo)
export const PUT = handler(async (req, ctx) => {
  await requireAdmin(req);
  const idProduit = Number(ctx.params?.id);
  const contentType = req.headers.get("content-type") || "";

  let champs: Record<string, unknown> = {};
  let photo_url: string | undefined;
  let video_url: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    champs = {
      nom_produit: form.get("nom_produit") || undefined,
      description: form.get("description") || undefined,
      prix_unitaire: form.get("prix_unitaire") ? Number(form.get("prix_unitaire")) : undefined,
      categorie: form.get("categorie") || undefined,
      seuil_alerte: form.get("seuil_alerte") ? Number(form.get("seuil_alerte")) : undefined,
      actif: form.has("actif") ? form.get("actif") === "true" : undefined,
    };
    const photo = form.get("photo") as File | null;
    const video = form.get("video") as File | null;
    if (photo && photo.size > 0) photo_url = await uploadFichierProduit(photo, "photos");
    if (video && video.size > 0) video_url = await uploadFichierProduit(video, "videos");
  } else {
    champs = await req.json();
  }

  const [existant] = await sql`SELECT * FROM produit WHERE id_produit = ${idProduit}`;
  if (!existant) throw new ApiError(404, "Produit introuvable.");

  const [produit] = await sql`
    UPDATE produit SET
      nom_produit   = ${(champs.nom_produit as string) ?? existant.nom_produit},
      description   = ${(champs.description as string) ?? existant.description},
      prix_unitaire = ${(champs.prix_unitaire as number) ?? existant.prix_unitaire},
      categorie     = ${(champs.categorie as string) ?? existant.categorie},
      seuil_alerte  = ${(champs.seuil_alerte as number) ?? existant.seuil_alerte},
      actif         = ${(champs.actif as boolean) ?? existant.actif},
      photo_url     = ${photo_url ?? existant.photo_url},
      video_url     = ${video_url ?? existant.video_url}
    WHERE id_produit = ${idProduit}
    RETURNING *
  `;

  return json({ produit });
});

// DELETE /api/admin/produits/:id — désactivation (soft delete)
export const DELETE = handler(async (req, ctx) => {
  await requireAdmin(req);
  const idProduit = Number(ctx.params?.id);

  const [produit] = await sql`
    UPDATE produit SET actif = FALSE WHERE id_produit = ${idProduit} RETURNING *
  `;
  if (!produit) throw new ApiError(404, "Produit introuvable.");

  return json({ produit });
});
