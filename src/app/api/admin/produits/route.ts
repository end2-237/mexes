import { handler, json, ApiError, requireAdmin } from "@/lib/http";
import { sql } from "@/lib/db";
import { uploadFichierProduit } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/admin/produits — liste des produits avec leur stock actuel
export const GET = handler(async (req) => {
  await requireAdmin(req);

  const produits = await sql`
    SELECT id_produit, nom_produit, description, prix_unitaire, categorie,
           photo_url, video_url, stock_actuel, seuil_alerte, actif, cree_le
    FROM produit
    ORDER BY cree_le DESC
  `;

  return json({ produits });
});

// POST /api/admin/produits — créer un produit (multipart/form-data)
//   nom_produit, description, prix_unitaire, categorie, stock_initial, seuil_alerte, photo?, video?
export const POST = handler(async (req) => {
  await requireAdmin(req);

  const contentType = req.headers.get("content-type") || "";

  let nom_produit = "";
  let description = "";
  let prix_unitaire = 0;
  let categorie = "";
  let stock_initial = 0;
  let seuil_alerte = 5;
  let photo_url: string | null = null;
  let video_url: string | null = null;

  if (contentType.includes("application/json")) {
    // Voie recommandée : le navigateur a déjà uploadé les fichiers vers Supabase
    // (via /signed-upload) et n'envoie que les URLs → pas de limite 4,5 Mo Vercel.
    const b = (await req.json()) || {};
    nom_produit = String(b.nom_produit || "").trim();
    description = String(b.description || "").trim();
    prix_unitaire = Number(b.prix_unitaire || 0);
    categorie = String(b.categorie || "").trim();
    stock_initial = Math.max(0, Number(b.stock_initial || 0));
    seuil_alerte = Number(b.seuil_alerte || 5);
    photo_url = b.photo_url || null;
    video_url = b.video_url || null;
  } else {
    // Voie multipart (petits fichiers) : upload côté serveur.
    const form = await req.formData();
    nom_produit = String(form.get("nom_produit") || "").trim();
    description = String(form.get("description") || "").trim();
    prix_unitaire = Number(form.get("prix_unitaire") || 0);
    categorie = String(form.get("categorie") || "").trim();
    stock_initial = Math.max(0, Number(form.get("stock_initial") || 0));
    seuil_alerte = Number(form.get("seuil_alerte") || 5);
    const photo = form.get("photo") as File | null;
    const video = form.get("video") as File | null;
    if (photo && photo.size > 0) photo_url = await uploadFichierProduit(photo, "photos");
    if (video && video.size > 0) video_url = await uploadFichierProduit(video, "videos");
  }

  if (!nom_produit || !prix_unitaire || prix_unitaire <= 0) {
    throw new ApiError(400, "nom_produit et prix_unitaire (positif) sont requis.");
  }

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

  if (stock_initial > 0) {
    await sql`
      INSERT INTO mouvement_stock (id_produit, type_mouvement, quantite, motif, stock_apres, cree_par)
      VALUES (${produit.id_produit}, 'entree', ${stock_initial}, 'Stock initial à la création', ${stock_initial}, 'admin')
    `;
  }

  return json({ produit }, 201);
});
