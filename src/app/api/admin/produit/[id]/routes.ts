import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken } from "@/lib/security";
import { uploadFichierProduit } from "@/lib/supabase";

// Destination : app/api/admin/produits/[id]/route.ts

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("UNAUTHORIZED");
  return verifyToken(token);
}

function erreurReponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "Erreur inconnue";
  const status = msg === "UNAUTHORIZED" ? 401 : 500;
  return NextResponse.json({ detail: msg }, { status });
}

// GET /api/admin/produits/:id — détail d'un produit
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const [produit] = await sql`SELECT * FROM produit WHERE id_produit = ${Number(params.id)}`;
    if (!produit) return NextResponse.json({ detail: "Produit introuvable." }, { status: 404 });
    return NextResponse.json({ produit });
  } catch (e) {
    return erreurReponse(e);
  }
}

// PUT /api/admin/produits/:id — mise à jour (JSON ou multipart si nouvelle photo/vidéo)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const idProduit = Number(params.id);
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
    if (!existant) return NextResponse.json({ detail: "Produit introuvable." }, { status: 404 });

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

    return NextResponse.json({ produit });
  } catch (e) {
    return erreurReponse(e);
  }
}

// DELETE /api/admin/produits/:id — désactivation (soft delete)
// On ne supprime jamais physiquement : ça préserverait mal l'historique des
// commandes et mouvements de stock déjà liés à ce produit.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const idProduit = Number(params.id);
    const [produit] = await sql`
      UPDATE produit SET actif = FALSE WHERE id_produit = ${idProduit} RETURNING *
    `;
    if (!produit) return NextResponse.json({ detail: "Produit introuvable." }, { status: 404 });
    return NextResponse.json({ produit });
  } catch (e) {
    return erreurReponse(e);
  }
}