-- ============================================================
-- Clé Minutes — Données de démarrage (catalogue + bibliothèque NLP)
-- À exécuter après schema.sql
-- ============================================================

-- Catalogue de produits par défaut
INSERT INTO produit (nom_produit, prix_unitaire, categorie, achat, adresse) VALUES
  ('Clé maison simple',      2500,  'cle maison',  'service', 'Douala'),
  ('Clé maison sécurité',    5000,  'cle maison',  'service', 'Douala'),
  ('Clé voiture basique',    12000, 'cle voiture', 'service', 'Douala'),
  ('Télécommande voiture',   20000, 'cle voiture', 'service', 'Douala'),
  ('Réparation serrure',     8000,  'reparation',  'service', 'Douala'),
  ('Duplication clé rapide', 2500,  'duplication', 'service', 'Douala')
ON CONFLICT DO NOTHING;

-- Bibliothèque de réponses NLP (fallback local sans appel API externe)
INSERT INTO bibliotheque_reponses (mots_cles, reponse, categorie, priorite) VALUES
  ('bonjour,salut,bonsoir,hello,coucou',
   '👋 Bienvenue chez Clé Minutes ! Je suis KeyBot. Comment puis-je vous aider aujourd''hui ?',
   'salutation', 10),
  ('prix,tarif,combien,coute,coût',
   'Voici nos tarifs : Clé maison simple 1 500–3 500 XAF, sécurité 3 500–7 000 XAF, clé voiture 8 000–25 000 XAF, réparation 3 000–50 000 XAF.',
   'tarifs', 8),
  ('paiement,payer,mtn,orange,money,uba',
   'Nous acceptons : MTN Mobile Money (678551577), Orange Money (691118708) et UBA Bank.',
   'paiement', 8),
  ('livraison,livrer,delai,suivi',
   'Livraison à Douala en 30 min – 2h. Frais 500–2 000 XAF selon la distance. Suivi temps réel disponible dans votre espace.',
   'livraison', 7),
  ('reparation,reparer,serrure,casse',
   'Nous réparons serrures et clés de maison comme de voiture. Réparation de 3 000 à 50 000 XAF selon le cas.',
   'reparation', 6),
  ('partenariat,partenaire,collaborer',
   'Pour un partenariat, écrivez-nous à partenariat@cleminutes.cm. Nous revenons vers vous rapidement !',
   'partenariat', 5),
  ('merci,thanks,super,parfait',
   'Avec plaisir ! 🔑 N''hésitez pas si vous avez d''autres questions.',
   'remerciement', 4)
ON CONFLICT DO NOTHING;
