# Clé Minutes — Dashboard Next.js (+ espace vitrine)

Portage du projet **FastAPI + PostgreSQL** (`cle_minute`) vers **Next.js 14 (App Router)**,
prêt pour **Supabase** et déployable sur **Vercel** en multi-hosting (domaine + sous-domaine).

## Ce qui a été converti

- ✅ **Routes API + logique métier** (FastAPI → Route Handlers Next.js) : auth unifiée,
  produits, panier, commandes, paiements, suivi livraison, admin, chatbot.
- ✅ **Dashboard admin** : design d'origine (thème blanc & bleu) porté en React/TypeScript.
- ✅ **Schéma de base** : modèles SQLAlchemy traduits en SQL Supabase (`supabase/schema.sql`).
- ⏸️ **Site vitrine** : volontairement **non converti**. Un emplacement réservé est prêt
  (`src/app/page.tsx`) pour une future intégration.

## Architecture multi-hosting (Vercel)

Une seule base de code, deux zones routées par `middleware.ts` selon le hostname :

| Hostname                 | Zone servie            |
| ------------------------ | ---------------------- |
| `cleminutes.cm` (racine) | Vitrine (placeholder)  |
| `app.cleminutes.cm`      | Dashboard (`/dashboard`) |

Configurez sur Vercel les domaines puis les variables `NEXT_PUBLIC_ROOT_DOMAIN`
et `NEXT_PUBLIC_DASHBOARD_HOST`. En local, le dashboard reste accessible via `/dashboard`.

## Démarrage

```bash
npm install
cp .env.example .env.local   # remplir DATABASE_URL Supabase, SECRET_KEY, etc.
npm run dev
```

### Base de données

Dans Supabase > SQL Editor, exécuter dans l'ordre :

1. `supabase/schema.sql` — crée les tables
2. `supabase/seed.sql` — catalogue + bibliothèque NLP du chatbot

Puis créer le premier admin : `POST /api/setup-admin` avec `{ "email": "...", "password": "..." }`.

## Principales routes API

| Méthode | Route                                   | Rôle                          |
| ------- | --------------------------------------- | ----------------------------- |
| POST    | `/api/auth/register`                    | Inscription web/mobile        |
| POST    | `/api/auth/verify-otp`                  | Activation + JWT              |
| POST    | `/api/auth/login`                       | Connexion                     |
| GET     | `/api/auth/me`                          | Profil connecté               |
| GET     | `/api/produits`                         | Catalogue                     |
| GET/POST| `/api/panier`, `/api/panier/ajouter`    | Panier                        |
| POST    | `/api/panier/valider`                   | Validation → commande         |
| POST    | `/api/paiements`                        | Paiement + reçu               |
| POST    | `/api/admin/login`                      | Connexion admin               |
| GET     | `/api/admin/dashboard`                  | Stats temps réel              |
| GET/PUT | `/api/admin/commandes`                  | Gestion commandes             |
| POST    | `/api/chat`                             | Chatbot (NLP local + Claude)  |

L'authentification reprend la logique d'origine : bcrypt + JWT HS256 (`src/lib/security.ts`).
La couche données utilise `postgres` sur la chaîne Supabase (`src/lib/db.ts`).
Les clients Supabase officiels sont aussi prêts (`src/lib/supabase.ts`) pour Auth/Storage.
