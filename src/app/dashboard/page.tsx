"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * DASHBOARD ADMIN — port fidèle de static/dashboard.html + onglet Produits & Stock.
 * Thème blanc & bleu Clé Minutes. Consomme les routes /api/admin/*.
 */

type CommandeLigne = {
  id_commande?: number;
  id?: number;
  statut_cmd?: string;
  statut?: string;
  paiement?: { montant?: number };
  total?: number;
  montant?: number;
};

type Produit = {
  id_produit: number;
  nom_produit: string;
  description: string | null;
  prix_unitaire: number;
  categorie: string | null;
  photo_url: string | null;
  video_url: string | null;
  stock_actuel: number;
  seuil_alerte: number;
  actif: boolean;
};

type Mouvement = {
  id_mouvement: number;
  type_mouvement: "entree" | "sortie" | "ajustement";
  quantite: number;
  motif: string | null;
  stock_apres: number;
  date_mouvement: string;
};

const STATUTS = ["En attente", "Confirmée", "En livraison", "Livrée", "Annulée"];

function badgeClasse(s: string): [string, string] {
  const map: Record<string, [string, string]> = {
    "En attente": ["badge-attente", "⏳"],
    Confirmée: ["badge-confirme", "✅"],
    "En livraison": ["badge-livraison", "🚚"],
    Livrée: ["badge-livre", "🎉"],
    Annulée: ["badge-annule", "❌"],
  };
  return map[s] || ["badge-attente", "?"];
}

export default function Dashboard() {
  const [verrouille, setVerrouille] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Page active dans la sidebar
  const [pageActive, setPageActive] = useState<"indicateurs" | "produits" | "commandes" | "alertes">("indicateurs");

  // ── État : Commandes (liste complète) ────────────────────
  type CommandeComplete = {
    id_commande: number;
    statut_cmd: string;
    date_paiement: string | null;
    date_livraison: string | null;
    nom_client: string;
    email_client: string;
    montant: number | null;
    mode_paiement: string | null;
    statut_transaction: string | null;
  };
  const [commandesToutes, setCommandesToutes] = useState<CommandeComplete[]>([]);
  const [chargementCommandes, setChargementCommandes] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState<string>("");

  // ── État : Alertes IDS ────────────────────────────────────
  type Alerte = {
    id_req: number;
    address_ip: string;
    danger: string;
    redis_key: string | null;
    times: string;
    details: string | null;
  };
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [chargementAlertes, setChargementAlertes] = useState(false);

  const [kpi, setKpi] = useState({ commandes: 0, alertes: 0, nlp: 0 });
  const [commandes, setCommandes] = useState<CommandeLigne[]>([]);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const [modalId, setModalId] = useState<number | null>(null);
  const [modalStatut, setModalStatut] = useState("En attente");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── État : Produits & Stock ─────────────────────────────
  const [produits, setProduits] = useState<Produit[]>([]);
  const [chargementProduits, setChargementProduits] = useState(false);

  const [formProduitOuvert, setFormProduitOuvert] = useState(false);
  const [nomProduit, setNomProduit] = useState("");
  const [descriptionProduit, setDescriptionProduit] = useState("");
  const [prixProduit, setPrixProduit] = useState("");
  const [categorieProduit, setCategorieProduit] = useState("");
  const [stockInitial, setStockInitial] = useState("0");
  const [photoProduit, setPhotoProduit] = useState<File | null>(null);
  const [videoProduit, setVideoProduit] = useState<File | null>(null);
  const [envoiProduit, setEnvoiProduit] = useState(false);

  const [produitStock, setProduitStock] = useState<Produit | null>(null);
  const [typeMouvement, setTypeMouvement] = useState<"entree" | "sortie" | "ajustement">("entree");
  const [quantiteMouvement, setQuantiteMouvement] = useState("1");
  const [motifMouvement, setMotifMouvement] = useState("");
  const [historique, setHistorique] = useState<Mouvement[]>([]);

  function toast(msg: string) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 3400);
  }

  async function connexion() {
    setErreur("");
    if (!email || !password) {
      setErreur("Veuillez remplir tous les champs.");
      return;
    }
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_admin: email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.access_token);
        setVerrouille(false);
        toast("✅ Bienvenue " + (data.admin?.nom || "Admin"));
      } else {
        setErreur(data.detail || "Identifiants invalides.");
      }
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }

  async function chargerDonnees(tk = token) {
    if (!tk) return;
    setRefreshSpin(true);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const data = await res.json();
      setKpi({
        commandes: data.commandes?.total ?? 0,
        alertes: data.securite?.alertes_critiques ?? 0,
        nlp: data.chatbot?.total_sessions ?? 0,
      });
      setCommandes(Array.isArray(data.commandes_recentes) ? data.commandes_recentes : []);
    } catch {
      toast("❌ Erreur lors du chargement.");
    } finally {
      setRefreshSpin(false);
    }
  }

  // ── Produits & Stock : fonctions ─────────────────────────
  async function chargerProduits(tk = token) {
    if (!tk) return;
    setChargementProduits(true);
    try {
      const res = await fetch("/api/admin/produits", {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const data = await res.json();
      setProduits(Array.isArray(data.produits) ? data.produits : []);
    } catch {
      toast("❌ Erreur lors du chargement des produits.");
    } finally {
      setChargementProduits(false);
    }
  }

  async function creerProduit() {
    if (!nomProduit.trim() || !prixProduit || Number(prixProduit) <= 0) {
      toast("❌ Nom et prix (positif) sont requis.");
      return;
    }
    setEnvoiProduit(true);
    try {
      // Upload direct navigateur → Supabase Storage (contourne la limite 4,5 Mo de Vercel)
      const uploadVersSupabase = async (file: File, dossier: "photos" | "videos") => {
        const r = await fetch("/api/admin/produits/signed-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dossier, filename: file.name }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Préparation de l'upload impossible.");
        const { error } = await supabase.storage.from("produits").uploadToSignedUrl(d.path, d.token, file);
        if (error) throw new Error(error.message);
        return d.publicUrl as string;
      };

      let photo_url: string | null = null;
      let video_url: string | null = null;
      if (photoProduit) photo_url = await uploadVersSupabase(photoProduit, "photos");
      if (videoProduit) video_url = await uploadVersSupabase(videoProduit, "videos");

      const res = await fetch("/api/admin/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nom_produit: nomProduit.trim(),
          description: descriptionProduit.trim(),
          prix_unitaire: Number(prixProduit),
          categorie: categorieProduit.trim(),
          stock_initial: Number(stockInitial || 0),
          photo_url,
          video_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(`❌ ${data.detail || "Échec de la création."}`);
        return;
      }
      toast(`✅ Produit "${nomProduit}" créé.`);
      setNomProduit("");
      setDescriptionProduit("");
      setPrixProduit("");
      setCategorieProduit("");
      setStockInitial("0");
      setPhotoProduit(null);
      setVideoProduit(null);
      setFormProduitOuvert(false);
      chargerProduits();
    } catch (e) {
      toast(`❌ ${e instanceof Error ? e.message : "Impossible de joindre le serveur."}`);
    } finally {
      setEnvoiProduit(false);
    }
  }

  async function ouvrirModalStock(p: Produit) {
    setProduitStock(p);
    setTypeMouvement("entree");
    setQuantiteMouvement("1");
    setMotifMouvement("");
    try {
      const res = await fetch(`/api/admin/produits/${p.id_produit}/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistorique(Array.isArray(data.mouvements) ? data.mouvements : []);
    } catch {
      setHistorique([]);
    }
  }

  async function confirmerMouvement() {
    if (!produitStock) return;
    const quantite = Number(quantiteMouvement);
    if (!quantite || quantite <= 0) {
      toast("❌ Quantité invalide.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/produits/${produitStock.id_produit}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type_mouvement: typeMouvement, quantite, motif: motifMouvement || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(`❌ ${data.detail || "Échec de l'opération."}`);
        return;
      }
      toast(`✅ Stock mis à jour : ${data.stock_actuel} unité(s) restante(s).`);
      setProduitStock(null);
      chargerProduits();
    } catch {
      toast("❌ Impossible de joindre le serveur.");
    }
  }

  // ── Commandes complètes : fonctions ──────────────────────
  async function chargerCommandesCompletes(statut = filtreStatut, tk = token) {
    if (!tk) return;
    setChargementCommandes(true);
    try {
      const url = statut
        ? `/api/admin/commandes?statut=${encodeURIComponent(statut)}`
        : "/api/admin/commandes";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      setCommandesToutes(Array.isArray(data.commandes) ? data.commandes : []);
    } catch {
      toast("❌ Erreur lors du chargement des commandes.");
    } finally {
      setChargementCommandes(false);
    }
  }

  // ── Alertes IDS : fonctions ───────────────────────────────
  async function chargerAlertes(tk = token) {
    if (!tk) return;
    setChargementAlertes(true);
    try {
      const res = await fetch("/api/admin/alertes", { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      setAlertes(Array.isArray(data.alertes) ? data.alertes : []);
    } catch {
      toast("❌ Erreur lors du chargement des alertes.");
    } finally {
      setChargementAlertes(false);
    }
  }

  useEffect(() => {
    if (token) chargerDonnees(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Charge les données de chaque onglet à la première ouverture (une fois par session)
  useEffect(() => {
    if (!token) return;
    if (pageActive === "produits" && produits.length === 0 && !chargementProduits) {
      chargerProduits(token);
    }
    if (pageActive === "commandes" && commandesToutes.length === 0 && !chargementCommandes) {
      chargerCommandesCompletes(filtreStatut, token);
    }
    if (pageActive === "alertes" && alertes.length === 0 && !chargementAlertes) {
      chargerAlertes(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pageActive]);

  function ouvrirModal(id: number, statut: string) {
    setModalId(id);
    setModalStatut(statut || "En attente");
  }

  async function confirmerMaj() {
    if (modalId == null) return;
    try {
      await fetch(`/api/admin/commandes/${modalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut_cmd: modalStatut }),
      });
      toast(`✅ Commande #${modalId} → ${modalStatut}`);
    } catch {
      toast("❌ Erreur lors de la mise à jour.");
    }
    setModalId(null);
    setTimeout(() => chargerDonnees(), 600);
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <style>{css}</style>

      {/* Écran de verrouillage */}
      {verrouille && (
        <div id="ecran-verrouillage">
          <div className="lock-card">
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div className="lock-icon-wrap">
                <i className="fa-solid fa-shield-halved" style={{ fontSize: 28, color: "#1D4ED8" }} />
              </div>
              <div className="lock-title">Authentification Admin</div>
              <div className="lock-sub">Accès restreint — Clé Minutes</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="lock-label">Email Administrateur</label>
                <input
                  type="email"
                  className="lock-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connexion()}
                  placeholder="admin@cleminutes.cm"
                />
              </div>
              <div>
                <label className="lock-label">Mot de passe</label>
                <input
                  type="password"
                  className="lock-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connexion()}
                  placeholder="••••••••"
                />
              </div>
              <button className="lock-btn" onClick={connexion}>
                <i className="fa-solid fa-unlock" style={{ marginRight: 6 }} />
                Déverrouiller la console
              </button>
              {erreur && <p style={{ color: "#EF4444", fontSize: 11, textAlign: "center", fontWeight: 600 }}>{erreur}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal statut commande */}
      {modalId != null && (
        <div className="modal-overlay" onClick={() => setModalId(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <i className="fa-solid fa-pen-to-square" style={{ color: "#1D4ED8", marginRight: 8 }} />
              Traiter la commande <span style={{ color: "#1D4ED8" }}>#{modalId}</span>
            </div>
            <label className="lock-label" style={{ color: "#64748B" }}>
              Nouveau statut
            </label>
            <select className="modal-select" value={modalStatut} onChange={(e) => setModalStatut(e.target.value)}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn-confirmer" onClick={confirmerMaj}>
              Confirmer la mise à jour
            </button>
            <button className="btn-annuler" onClick={() => setModalId(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modal création produit */}
      {formProduitOuvert && (
        <div className="modal-overlay" onClick={() => !envoiProduit && setFormProduitOuvert(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <i className="fa-solid fa-box-open" style={{ color: "#1D4ED8", marginRight: 8 }} />
              Nouveau produit
            </div>
            <div className="form-grid">
              <div>
                <label className="lock-label">Nom du produit *</label>
                <input
                  className="lock-input"
                  value={nomProduit}
                  onChange={(e) => setNomProduit(e.target.value)}
                  placeholder="Clé sécurisée 3 points"
                />
              </div>
              <div>
                <label className="lock-label">Catégorie</label>
                <input
                  className="lock-input"
                  value={categorieProduit}
                  onChange={(e) => setCategorieProduit(e.target.value)}
                  placeholder="Serrurerie"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="lock-label">Description</label>
                <textarea
                  className="lock-input"
                  style={{ minHeight: 70, resize: "vertical" }}
                  value={descriptionProduit}
                  onChange={(e) => setDescriptionProduit(e.target.value)}
                  placeholder="Détails, matériau, compatibilité..."
                />
              </div>
              <div>
                <label className="lock-label">Prix unitaire (FCFA) *</label>
                <input
                  className="lock-input"
                  type="number"
                  min={0}
                  value={prixProduit}
                  onChange={(e) => setPrixProduit(e.target.value)}
                  placeholder="2500"
                />
              </div>
              <div>
                <label className="lock-label">Stock initial</label>
                <input
                  className="lock-input"
                  type="number"
                  min={0}
                  value={stockInitial}
                  onChange={(e) => setStockInitial(e.target.value)}
                />
              </div>
              <div>
                <label className="lock-label">Photo du produit</label>
                <input
                  className="lock-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoProduit(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="lock-label">Vidéo du produit</label>
                <input
                  className="lock-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoProduit(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <button className="btn-confirmer" disabled={envoiProduit} onClick={creerProduit} style={{ marginTop: 16 }}>
              {envoiProduit ? "Enregistrement..." : "Créer le produit"}
            </button>
            <button className="btn-annuler" onClick={() => setFormProduitOuvert(false)} disabled={envoiProduit}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modal mouvement de stock */}
      {produitStock && (
        <div className="modal-overlay" onClick={() => setProduitStock(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <i className="fa-solid fa-boxes-stacked" style={{ color: "#1D4ED8", marginRight: 8 }} />
              Stock — {produitStock.nom_produit}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
              Stock actuel : <strong style={{ color: "#1E293B" }}>{produitStock.stock_actuel}</strong> unité(s)
            </div>

            <label className="lock-label">Type de mouvement</label>
            <select
              className="modal-select"
              value={typeMouvement}
              onChange={(e) => setTypeMouvement(e.target.value as typeof typeMouvement)}
            >
              <option value="entree">Entrée (réapprovisionnement)</option>
              <option value="sortie">Sortie (vente / usage)</option>
              <option value="ajustement">Ajustement (nouvelle valeur exacte)</option>
            </select>

            <label className="lock-label">Quantité</label>
            <input
              className="lock-input"
              type="number"
              min={1}
              value={quantiteMouvement}
              onChange={(e) => setQuantiteMouvement(e.target.value)}
              style={{ marginBottom: 10 }}
            />

            <label className="lock-label">Motif (optionnel)</label>
            <input
              className="lock-input"
              value={motifMouvement}
              onChange={(e) => setMotifMouvement(e.target.value)}
              placeholder="Livraison fournisseur, casse, inventaire..."
              style={{ marginBottom: 14 }}
            />

            <button className="btn-confirmer" onClick={confirmerMouvement}>
              Valider le mouvement
            </button>
            <button className="btn-annuler" onClick={() => setProduitStock(null)}>
              Fermer
            </button>

            {historique.length > 0 && (
              <div style={{ marginTop: 18, borderTop: "1.5px solid #BFDBFE", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>
                  Historique récent
                </div>
                <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {historique.map((m) => (
                    <div
                      key={m.id_mouvement}
                      style={{ fontSize: 11, display: "flex", justifyContent: "space-between", color: "#1E293B" }}
                    >
                      <span>
                        {m.type_mouvement === "entree" ? "⬆️ Entrée" : m.type_mouvement === "sortie" ? "⬇️ Sortie" : "🔧 Ajustement"}{" "}
                        {m.quantite} — {m.motif || "—"}
                      </span>
                      <span style={{ color: "#94A3B8" }}>{new Date(m.date_mouvement).toLocaleDateString("fr-CM")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      <div id="toast" className={toastMsg ? "show" : ""}>
        {toastMsg}
      </div>

      {/* Sidebar */}
      <aside>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: "1.5px solid #BFDBFE",
          }}
        >
          <div className="logo-badge">
            <i className="fa-solid fa-key" style={{ fontSize: 15 }} />
          </div>
          <div>
            <div className="logo-name">CLÉ MINUTES</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <span className="status-dot" />
              <span className="status-label">Opérationnel</span>
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <a
            href="#"
            className={`nav-item${pageActive === "indicateurs" ? " actif" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setPageActive("indicateurs");
            }}
          >
            <i className="fa-solid fa-gauge-high" />
            Indicateurs
          </a>
          <a
            href="#"
            className={`nav-item${pageActive === "produits" ? " actif" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setPageActive("produits");
            }}
          >
            <i className="fa-solid fa-boxes-stacked" />
            Produits & Stock
          </a>
          <a
            href="#"
            className={`nav-item${pageActive === "commandes" ? " actif" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setPageActive("commandes");
            }}
          >
            <i className="fa-solid fa-cash-register" />
            Commandes
          </a>
          <a
            href="#"
            className={`nav-item${pageActive === "alertes" ? " actif" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setPageActive("alertes");
            }}
          >
            <i className="fa-solid fa-user-secret" />
            Alertes IDS
          </a>
        </nav>

        <div className="nav-sep" />
        <button
          className="btn-deco"
          onClick={() => {
            setToken(null);
            setVerrouille(true);
          }}
        >
          <i className="fa-solid fa-right-from-bracket" style={{ color: "#EF4444" }} />
          Déconnexion
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column" }}>
        {pageActive === "indicateurs" ? (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Supervision en Temps Réel</div>
                <div className="page-sub">Données Supabase — system_ia</div>
              </div>
              <button className="btn-refresh" onClick={() => chargerDonnees()}>
                <i className={`fa-solid fa-rotate-right${refreshSpin ? " fa-spin" : ""}`} /> Actualiser
              </button>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Commandes globales</div>
                <div className="kpi-val" style={{ color: "#1D4ED8" }}>
                  {kpi.commandes}
                </div>
                <div className="kpi-hint">Total en base de données</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Alertes Sécurité Réseau</div>
                <div className="kpi-val" style={{ color: "#EF4444" }}>
                  {kpi.alertes}
                </div>
                <div className="kpi-hint">IDS/IPS actif</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Sessions Chatbot</div>
                <div className="kpi-val" style={{ color: "#8B5CF6" }}>
                  {kpi.nlp}
                </div>
                <div className="kpi-hint">Web + WhatsApp</div>
              </div>
            </div>

            <div className="table-card" style={{ flex: 1, minHeight: 260 }}>
              <div className="table-title">
                <i className="fa-solid fa-list-check" style={{ color: "#1D4ED8" }} />
                File d&apos;attente des commandes
                <span className="badge-count">{commandes.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>#ID</th>
                      <th>Statut Actuel</th>
                      <th>Total Facturé</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandes.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontStyle: "italic" }}>
                          <i
                            className="fa-solid fa-inbox"
                            style={{ fontSize: 22, color: "#BFDBFE", display: "block", marginBottom: 8 }}
                          />
                          Aucune commande enregistrée en base de données.
                        </td>
                      </tr>
                    ) : (
                      commandes.map((c, i) => {
                        const id = c.id_commande ?? c.id ?? 0;
                        const statut = c.statut_cmd ?? c.statut ?? "En attente";
                        const total = c.paiement?.montant ?? c.total ?? c.montant ?? 0;
                        const [cls, ico] = badgeClasse(statut);
                        return (
                          <tr key={i}>
                            <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#1D4ED8" }}>#{id}</td>
                            <td>
                              <span className={`badge ${cls}`}>
                                {ico} {statut}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700 }}>{Number(total).toLocaleString("fr-CM")} FCFA</td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn-traiter" onClick={() => ouvrirModal(Number(id), statut)}>
                                <i className="fa-solid fa-pen" style={{ marginRight: 4 }} />
                                Traiter
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : pageActive === "commandes" ? (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Commandes</div>
                <div className="page-sub">Liste complète — 200 dernières commandes</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <select
                  className="modal-select"
                  style={{ width: "auto", marginBottom: 0 }}
                  value={filtreStatut}
                  onChange={(e) => {
                    setFiltreStatut(e.target.value);
                    chargerCommandesCompletes(e.target.value);
                  }}
                >
                  <option value="">Tous les statuts</option>
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className="btn-refresh" onClick={() => chargerCommandesCompletes()}>
                  <i className={`fa-solid fa-rotate-right${chargementCommandes ? " fa-spin" : ""}`} /> Actualiser
                </button>
              </div>
            </div>

            <div className="table-card" style={{ flex: 1, minHeight: 260 }}>
              <div className="table-title">
                <i className="fa-solid fa-cash-register" style={{ color: "#1D4ED8" }} />
                Commandes
                <span className="badge-count">{commandesToutes.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>#ID</th>
                      <th>Client</th>
                      <th>Statut</th>
                      <th>Montant</th>
                      <th>Paiement</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commandesToutes.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontStyle: "italic" }}>
                          Aucune commande trouvée.
                        </td>
                      </tr>
                    ) : (
                      commandesToutes.map((c) => {
                        const [cls, ico] = badgeClasse(c.statut_cmd);
                        return (
                          <tr key={c.id_commande}>
                            <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#1D4ED8" }}>#{c.id_commande}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{c.nom_client}</div>
                              <div style={{ fontSize: 10, color: "#94A3B8" }}>{c.email_client}</div>
                            </td>
                            <td>
                              <span className={`badge ${cls}`}>
                                {ico} {c.statut_cmd}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {c.montant != null ? `${Number(c.montant).toLocaleString("fr-CM")} FCFA` : "—"}
                            </td>
                            <td style={{ color: "#64748B" }}>{c.mode_paiement || "—"}</td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn-traiter" onClick={() => ouvrirModal(c.id_commande, c.statut_cmd)}>
                                <i className="fa-solid fa-pen" style={{ marginRight: 4 }} />
                                Traiter
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : pageActive === "alertes" ? (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Alertes Sécurité (IDS/IPS)</div>
                <div className="page-sub">200 dernières alertes détectées</div>
              </div>
              <button className="btn-refresh" onClick={() => chargerAlertes()}>
                <i className={`fa-solid fa-rotate-right${chargementAlertes ? " fa-spin" : ""}`} /> Actualiser
              </button>
            </div>

            <div className="table-card" style={{ flex: 1, minHeight: 260 }}>
              <div className="table-title">
                <i className="fa-solid fa-user-secret" style={{ color: "#EF4444" }} />
                Alertes
                <span className="badge-count">{alertes.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Adresse IP</th>
                      <th>Type de danger</th>
                      <th>Détails</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertes.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontStyle: "italic" }}>
                          Aucune alerte enregistrée. Tout est calme. ✅
                        </td>
                      </tr>
                    ) : (
                      alertes.map((a) => (
                        <tr key={a.id_req}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{a.address_ip}</td>
                          <td>
                            <span className="badge badge-annule">⚠️ {a.danger}</span>
                          </td>
                          <td style={{ color: "#64748B", maxWidth: 320 }}>{a.details || "—"}</td>
                          <td style={{ color: "#94A3B8", fontSize: 11 }}>
                            {new Date(a.times).toLocaleString("fr-CM")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="page-header">
              <div>
                <div className="page-title">Produits & Stock</div>
                <div className="page-sub">Catalogue — stock entrant et restant</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-refresh" onClick={() => chargerProduits()}>
                  <i className={`fa-solid fa-rotate-right${chargementProduits ? " fa-spin" : ""}`} /> Actualiser
                </button>
                <button className="btn-ajouter" onClick={() => setFormProduitOuvert(true)}>
                  <i className="fa-solid fa-plus" /> Nouveau produit
                </button>
              </div>
            </div>

            <div className="table-card" style={{ flex: 1, minHeight: 260 }}>
              <div className="table-title">
                <i className="fa-solid fa-boxes-stacked" style={{ color: "#1D4ED8" }} />
                Produits enregistrés
                <span className="badge-count">{produits.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Produit</th>
                      <th>Catégorie</th>
                      <th>Prix</th>
                      <th>Stock restant</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produits.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontStyle: "italic" }}>
                          <i
                            className="fa-solid fa-box-open"
                            style={{ fontSize: 22, color: "#BFDBFE", display: "block", marginBottom: 8 }}
                          />
                          Aucun produit enregistré.
                        </td>
                      </tr>
                    ) : (
                      produits.map((p) => {
                        const stockBas = p.stock_actuel <= p.seuil_alerte;
                        return (
                          <tr key={p.id_produit}>
                            <td>
                              {p.photo_url ? (
                                <img
                                  src={p.photo_url}
                                  alt={p.nom_produit}
                                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }}
                                />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#EFF6FF" }} />
                              )}
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {p.nom_produit}
                              {!p.actif && <span style={{ marginLeft: 6, fontSize: 10, color: "#EF4444" }}>(désactivé)</span>}
                            </td>
                            <td style={{ color: "#64748B" }}>{p.categorie || "—"}</td>
                            <td style={{ fontWeight: 700 }}>{Number(p.prix_unitaire).toLocaleString("fr-CM")} FCFA</td>
                            <td>
                              <span className={`badge ${stockBas ? "badge-annule" : "badge-livre"}`}>
                                {stockBas ? "⚠️" : "✅"} {p.stock_actuel}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn-traiter" onClick={() => ouvrirModalStock(p)}>
                                <i className="fa-solid fa-boxes-packing" style={{ marginRight: 4 }} />
                                Gérer le stock
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const css = `
#ecran-verrouillage { position: fixed; inset: 0; z-index: 50;
  background: linear-gradient(135deg,#1D4ED8 0%,#2563EB 50%,#3B82F6 100%);
  display: flex; align-items: center; justify-content: center; padding: 16px; }
.lock-card { background:#fff; border-radius:20px; padding:36px 32px; max-width:380px; width:100%;
  box-shadow:0 20px 60px rgba(72,110,215,.25); }
.lock-icon-wrap { display:inline-flex; padding:14px; background:#EFF6FF; border-radius:16px; margin-bottom:14px; }
.lock-title { font-size:18px; font-weight:800; color:#1E293B; }
.lock-sub { font-size:11px; color:#64748B; margin-top:4px; }
.lock-label { display:block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#64748B; margin-bottom:5px; }
.lock-input { width:100%; background:#F8FAFC; border:1.5px solid #BFDBFE; color:#1E293B; border-radius:10px; padding:11px 14px; font-size:13px; outline:none; }
.lock-input:focus { border-color:#3B82F6; background:#EFF6FF; }
.lock-btn { width:100%; background:linear-gradient(135deg,#1D4ED8,#3B82F6); color:#fff; border:none; border-radius:11px; padding:13px; font-size:12px; font-weight:700; cursor:pointer; letter-spacing:.05em; text-transform:uppercase; box-shadow:0 4px 18px rgba(59,130,246,.4); }
aside { width:228px; flex-shrink:0; background:#fff; border-right:1.5px solid #BFDBFE; display:flex; flex-direction:column; padding:20px 14px; }
.logo-badge { background:linear-gradient(135deg,#1D4ED8,#3B82F6); color:#fff; padding:9px 10px; border-radius:11px; }
.logo-name { font-size:12px; font-weight:800; color:#1E293B; letter-spacing:.04em; }
.status-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#10B981; animation:ping-dot 1.4s infinite; }
.status-label { font-size:10px; color:#10B981; font-weight:600; }
.nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; font-size:12px; font-weight:600; color:#64748B; text-decoration:none; transition:all .18s; }
.nav-item:hover, .nav-item.actif { background:#EFF6FF; color:#1D4ED8; }
.nav-sep { border-top:1.5px solid #BFDBFE; margin:14px 0; }
.btn-deco { display:flex; align-items:center; gap:8px; width:100%; padding:9px 12px; border-radius:10px; background:transparent; border:1.5px solid #BFDBFE; color:#64748B; font-size:11px; font-weight:600; cursor:pointer; }
.btn-deco:hover { background:#FEE2E2; color:#991B1B; border-color:#FCA5A5; }
.page-header { display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; border-bottom:1.5px solid #BFDBFE; margin-bottom:20px; }
.page-title { font-size:20px; font-weight:800; color:#1E293B; }
.page-sub { font-size:11px; color:#64748B; margin-top:3px; }
.btn-refresh { display:flex; align-items:center; gap:6px; background:#EFF6FF; border:1.5px solid #BFDBFE; color:#1D4ED8; border-radius:9px; padding:8px 14px; font-size:11px; font-weight:700; cursor:pointer; }
.btn-refresh:hover { background:#DBEAFE; }
.btn-ajouter { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#1D4ED8,#3B82F6); border:none; color:#fff; border-radius:9px; padding:8px 14px; font-size:11px; font-weight:700; cursor:pointer; }
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:20px; }
.kpi-card { background:#fff; border:1.5px solid #BFDBFE; border-radius:14px; padding:18px 16px; }
.kpi-card:hover { border-color:#3B82F6; box-shadow:0 4px 16px rgba(59,130,246,.1); }
.kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#64748B; }
.kpi-val { font-size:26px; font-weight:900; margin-top:4px; }
.kpi-hint { font-size:10px; color:#94A3B8; margin-top:3px; }
.table-card { background:#fff; border:1.5px solid #BFDBFE; border-radius:14px; padding:18px; display:flex; flex-direction:column; }
.table-title { font-size:13px; font-weight:700; color:#1E293B; display:flex; align-items:center; gap:8px; margin-bottom:14px; }
.badge-count { background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; padding:2px 10px; border-radius:999px; font-size:10px; font-weight:700; }
table { width:100%; font-size:12px; border-collapse:collapse; }
thead th { background:#F8FAFC; padding:10px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748B; text-align:left; border-bottom:1.5px solid #BFDBFE; }
tbody tr { border-bottom:1px solid #F1F5F9; }
tbody tr:hover { background:#F8FAFC; }
tbody td { padding:10px 12px; color:#1E293B; vertical-align: middle; }
.badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:700; }
.badge-attente { background:#FEF9C3; color:#854D0E; border:1px solid #FDE68A; }
.badge-confirme { background:#D1FAE5; color:#065F46; border:1px solid #6EE7B7; }
.badge-livraison { background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; }
.badge-livre { background:#D1FAE5; color:#065F46; border:1px solid #34D399; }
.badge-annule { background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5; }
.btn-traiter { background:#EFF6FF; color:#1D4ED8; border:1.5px solid #BFDBFE; border-radius:8px; padding:5px 13px; font-size:10px; font-weight:700; cursor:pointer; }
.btn-traiter:hover { background:#1D4ED8; color:#fff; border-color:#1D4ED8; }
.modal-overlay { position:fixed; inset:0; background:rgba(30,41,59,.35); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(3px); }
.modal-box { background:#fff; border:1.5px solid #BFDBFE; border-radius:18px; padding:28px; max-width:420px; width:100%; box-shadow:0 20px 50px rgba(29,78,216,.12); }
.modal-title { font-size:15px; font-weight:800; color:#1E293B; margin-bottom:18px; }
.modal-select { width:100%; background:#F8FAFC; border:1.5px solid #BFDBFE; color:#1E293B; border-radius:10px; padding:10px 14px; font-size:12px; font-weight:600; outline:none; margin-bottom:10px; }
.btn-confirmer { width:100%; background:linear-gradient(135deg,#1D4ED8,#3B82F6); color:#fff; border:none; border-radius:10px; padding:12px; font-size:12px; font-weight:700; cursor:pointer; }
.btn-confirmer:disabled { opacity:0.6; cursor:not-allowed; }
.btn-annuler { width:100%; background:transparent; border:1.5px solid #BFDBFE; color:#64748B; border-radius:10px; padding:10px; font-size:12px; font-weight:600; cursor:pointer; margin-top:8px; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
#toast { position:fixed; bottom:24px; right:24px; background:#fff; border:1.5px solid #BFDBFE; border-left:4px solid #1D4ED8; color:#1E293B; padding:12px 18px; border-radius:10px; font-size:12px; font-weight:600; z-index:200; box-shadow:0 8px 24px rgba(29,78,216,.14); transform:translateY(80px); opacity:0; transition:all .32s; }
#toast.show { transform:translateY(0); opacity:1; }
`;