-- ============================================================
-- Clé Minutes — Schéma PostgreSQL pour Supabase
-- Traduction fidèle de app/models/database.py (SQLAlchemy)
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- MODÈLE 1 : utilisateur
CREATE TABLE IF NOT EXISTS utilisateur (
    id_client     SERIAL PRIMARY KEY,
    nom_client    VARCHAR(100) NOT NULL,
    email_client  VARCHAR(200) UNIQUE NOT NULL,
    statut        VARCHAR(50) DEFAULT 'actif',
    password      VARCHAR(255) NOT NULL,
    code_postal   VARCHAR(20)
);

-- MODÈLE 2 : inscription
CREATE TABLE IF NOT EXISTS inscription (
    id_ins        SERIAL PRIMARY KEY,
    id_client     INTEGER NOT NULL REFERENCES utilisateur(id_client),
    code_otp      INTEGER,
    liens_app     VARCHAR(500),
    liens_besoin  VARCHAR(500),
    token_jwt     TEXT
);

-- MODÈLE 3 : produit
CREATE TABLE IF NOT EXISTS produit (
    id_produit    SERIAL PRIMARY KEY,
    nom_produit   VARCHAR(200) NOT NULL,
    prix_unitaire NUMERIC(10, 2) NOT NULL,
    categorie     VARCHAR(100),
    achat         VARCHAR(50),
    adresse       VARCHAR(300)
);

-- MODÈLE 4 : panier
CREATE TABLE IF NOT EXISTS panier (
    id_panier      SERIAL PRIMARY KEY,
    id_client      INTEGER NOT NULL REFERENCES utilisateur(id_client),
    valider_panier BOOLEAN DEFAULT FALSE,
    historique     TEXT
);

-- MODÈLE 5 : ligne_panier
CREATE TABLE IF NOT EXISTS ligne_panier (
    id_ligne   SERIAL PRIMARY KEY,
    id_panier  INTEGER NOT NULL REFERENCES panier(id_panier),
    id_produit INTEGER NOT NULL REFERENCES produit(id_produit),
    quantite   INTEGER NOT NULL DEFAULT 1
);

-- MODÈLE 6 : commande
CREATE TABLE IF NOT EXISTS commande (
    id_commande    SERIAL PRIMARY KEY,
    id_client      INTEGER NOT NULL REFERENCES utilisateur(id_client),
    id_panier      INTEGER REFERENCES panier(id_panier),
    date_paiement  TIMESTAMPTZ,
    date_livraison TIMESTAMPTZ,
    statut_cmd     VARCHAR(50) NOT NULL DEFAULT 'En attente',
    CONSTRAINT chk_statut_commande CHECK (
        statut_cmd IN ('En attente', 'Confirmée', 'En livraison', 'Livrée', 'Annulée')
    )
);

-- MODÈLE 7 : paiement
CREATE TABLE IF NOT EXISTS paiement (
    id_trans           SERIAL PRIMARY KEY,
    id_commande        INTEGER NOT NULL REFERENCES commande(id_commande),
    mode_paiement      VARCHAR(50) NOT NULL,
    montant            NUMERIC(12, 2) NOT NULL,
    date_transaction   TIMESTAMPTZ DEFAULT now(),
    statut_transaction VARCHAR(50) DEFAULT 'En attente'
);

-- MODÈLE 8 : recu
CREATE TABLE IF NOT EXISTS recu (
    id_recu       SERIAL PRIMARY KEY,
    id_trans      INTEGER NOT NULL REFERENCES paiement(id_trans),
    quantite      INTEGER NOT NULL,
    prix_unitaire NUMERIC(10, 2) NOT NULL,
    prix_total    NUMERIC(12, 2) NOT NULL,
    date_emission TIMESTAMPTZ DEFAULT now(),
    qr_code_data  TEXT
);

-- MODÈLE 9 : livraison
CREATE TABLE IF NOT EXISTS livraison (
    id_livreur       SERIAL PRIMARY KEY,
    id_commande      INTEGER NOT NULL REFERENCES commande(id_commande),
    frais_livraison  NUMERIC(8, 2) NOT NULL DEFAULT 0,
    position_livreur VARCHAR(300),
    position_client  VARCHAR(300)
);

-- MODÈLE 10 : chatbot
CREATE TABLE IF NOT EXISTS chatbot (
    id_session   SERIAL PRIMARY KEY,
    id_client    INTEGER REFERENCES utilisateur(id_client),
    service      VARCHAR(200),
    canal        VARCHAR(50) DEFAULT 'web',
    history_user TEXT,
    date_session TIMESTAMPTZ DEFAULT now()
);

-- MODÈLE 11 : admin
CREATE TABLE IF NOT EXISTS admin (
    id_admin    SERIAL PRIMARY KEY,
    nom_admin   VARCHAR(100) NOT NULL,
    email_admin VARCHAR(200) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    decision    TEXT
);

-- MODÈLE 12 : logs_requetes (IDS/IPS)
CREATE TABLE IF NOT EXISTS logs_requetes (
    id_req     SERIAL PRIMARY KEY,
    address_ip INET,
    danger     VARCHAR(100),
    redis_key  VARCHAR(200),
    times      TIMESTAMPTZ DEFAULT now(),
    details    TEXT
);

-- Table additionnelle : sessions_utilisateur (port de token_manager.py)
CREATE TABLE IF NOT EXISTS sessions_utilisateur (
    id_session    SERIAL PRIMARY KEY,
    id_client     INTEGER NOT NULL REFERENCES utilisateur(id_client),
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    canal         VARCHAR(50) DEFAULT 'web',
    telephone_wa  VARCHAR(30),
    appareil      VARCHAR(200),
    actif         BOOLEAN DEFAULT TRUE,
    cree_le       TIMESTAMPTZ DEFAULT now(),
    expire_le     TIMESTAMPTZ NOT NULL
);

-- Bibliothèque NLP de réponses du chatbot (port de bibliotheque_reponses.py)
CREATE TABLE IF NOT EXISTS bibliotheque_reponses (
    id_reponse  SERIAL PRIMARY KEY,
    mots_cles   TEXT NOT NULL,
    reponse     TEXT NOT NULL,
    categorie   VARCHAR(100),
    priorite    INTEGER DEFAULT 1
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_commande_statut ON commande(statut_cmd);
CREATE INDEX IF NOT EXISTS idx_panier_client ON panier(id_client, valider_panier);
CREATE INDEX IF NOT EXISTS idx_paiement_commande ON paiement(id_commande);
