import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken } from "@/lib/security";
import { uploadFichierProduit } from "@/lib/supabase";

// Destination : app/api/admin/produits/route.ts

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

// GET /api/admin/produits — liste des produits avec leur stock actuel
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const produits = await sql`
      SELECT id_produit, nom_produit, description, prix_unitaire, categorie,
             photo_url, video_url, stock_actuel, seuil_alerte, actif, cree_le
      FROM produit
      ORDER BY cree_le DESC
    `;
    return NextResponse.json({ produits });
  } catch (e) {
    return erreurReponse(e);
  }
}

// POST /api/admin/produits — créer un produit
// Envoyer en multipart/form-data (obligatoire dès qu'on joint photo/vidéo) :
//   nom_produit, description, prix_unitaire, categorie, stock_initial, photo?, video?
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const form = await req.formData();

    const nom_produit = String(form.get("nom_produit") || "").trim();
    const description = String(form.get("description") || "").trim();
    const prix_unitaire = Number(form.get("prix_unitaire") || 0);
    const categorie = String(form.get("categorie") || "").trim();
    const stock_initial = Math.max(0, Number(form.get("stock_initial") || 0));
    const seuil_alerte = Number(form.get("seuil_alerte") || 5);
    const photo = form.get("photo") as File | null;
    const video = form.get("video") as File | null;

    if (!nom_produit || !prix_unitaire || prix_unitaire <= 0) {
      return NextResponse.json(
        { detail: "nom_produit et prix_unitaire (positif) sont requis." },
        { status: 400 }
      );
    }

    let photo_url: string | null = null;
    let video_url: string | null = null;
    if (photo && photo.size > 0) photo_url = await uploadFichierProduit(photo, "photos");
    if (video && video.size > 0) video_url = await uploadFichierProduit(video, "videos");

    const [produit] = await sql`
      INSERT INTO produit (
        nom_produit, description, prix_unitaire, categorie,
        photo_url, video_url, stock_actuel, seuil_alerte
      )
      VALUES (
        ${nom_produit}, ${description}, ${prix_unitaire}, ${categorie},
        ${photo_url}, ${video_url}, ${stock_initial}, ${seuil_alerte}
      )
      RETURNING *
    `;

    // Trace le stock initial comme un mouvement d'entrée, pour garder
    // un historique complet dès la création du produit.
    if (stock_initial > 0) {
      await sql`
        INSERT INTO mouvement_stock (id_produit, type_mouvement, quantite, motif, stock_apres, cree_par)
        VALUES (${produit.id_produit}, 'entree', ${stock_initial}, 'Stock initial à la création', ${stock_initial}, 'admin')
      `;
    }

    return NextResponse.json({ produit }, { status: 201 });
  } catch (e) {
    return erreurReponse(e);
  }
}