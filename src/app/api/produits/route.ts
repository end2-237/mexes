export const dynamic = "force-dynamic";
import { handler, json, ApiError, requireUser } from "@/lib/http";
import { sql } from "@/lib/db";

// GET /api/produits?categorie=... — liste publique (port de lister_produits)
export const GET = handler(async (req) => {
  const { searchParams } = new URL(req.url);
  const categorie = searchParams.get("categorie");

  const produits = categorie
    ? await sql`SELECT * FROM produit WHERE categorie ILIKE ${"%" + categorie + "%"}`
    : await sql`SELECT * FROM produit`;

  return json(produits);
});

// POST /api/produits — création (admin/connecté) (port de creer_produit)
export const POST = handler(async (req) => {
  await requireUser(req);
  const { nom_produit, prix_unitaire, categorie = null, adresse = null } =
    (await req.json()) || {};
  if (!nom_produit || prix_unitaire === undefined)
    throw new ApiError(422, "nom_produit et prix_unitaire requis.");

  const [produit] = await sql`
    INSERT INTO produit (nom_produit, prix_unitaire, categorie, adresse)
    VALUES (${nom_produit}, ${prix_unitaire}, ${categorie}, ${adresse})
    RETURNING *
  `;
  return json(produit, 201);
});
