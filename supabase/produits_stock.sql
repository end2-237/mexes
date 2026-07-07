-- ============================================================
-- Clé Minutes — Migration : catalogue produits enrichi + stock + rendez-vous
-- À exécuter dans Supabase > SQL Editor (après schema.sql).
-- Aligne la base sur le dashboard (photos/vidéos, stock) et l'automatisation n8n.
-- ============================================================

-- Colonnes enrichies du produit (dashboard Produits & Stock)
ALTER TABLE produit ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE produit ADD COLUMN IF NOT EXISTS photo_url     VARCHAR(500);
ALTER TABLE produit ADD COLUMN IF NOT EXISTS video_url     VARCHAR(500);
ALTER TABLE produit ADD COLUMN IF NOT EXISTS stock_actuel  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE produit ADD COLUMN IF NOT EXISTS seuil_alerte  INTEGER NOT NULL DEFAULT 5;
ALTER TABLE produit ADD COLUMN IF NOT EXISTS actif         BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE produit ADD COLUMN IF NOT EXISTS cree_le       TIMESTAMPTZ NOT NULL DEFAULT now();

-- Mouvements de stock (entrée / sortie / ajustement)
CREATE TABLE IF NOT EXISTS mouvement_stock (
    id_mouvement   SERIAL PRIMARY KEY,
    id_produit     INTEGER NOT NULL REFERENCES produit(id_produit),
    type_mouvement VARCHAR(20) NOT NULL CHECK (type_mouvement IN ('entree', 'sortie', 'ajustement')),
    quantite       INTEGER NOT NULL,
    motif          TEXT,
    stock_apres    INTEGER NOT NULL,
    cree_par       VARCHAR(100) DEFAULT 'admin',
    date_mouvement TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mouvement_produit ON mouvement_stock(id_produit, date_mouvement DESC);

-- Rendez-vous pris via l'automatisation WhatsApp (n8n)
CREATE TABLE IF NOT EXISTS rendez_vous (
    id_rdv       SERIAL PRIMARY KEY,
    id_client    INTEGER REFERENCES utilisateur(id_client),
    nom_client   VARCHAR(150),
    telephone    VARCHAR(30),
    id_produit   INTEGER REFERENCES produit(id_produit),
    date_rdv     TIMESTAMPTZ,
    adresse      VARCHAR(300),
    canal        VARCHAR(50) DEFAULT 'whatsapp',
    statut       VARCHAR(50) DEFAULT 'demandé',
    note         TEXT,
    cree_le      TIMESTAMPTZ DEFAULT now()
);

-- Bucket Storage "produits" : à créer dans Supabase > Storage (public) pour les photos/vidéos.
