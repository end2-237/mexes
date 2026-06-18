"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DASHBOARD ADMIN — port fidèle de static/dashboard.html
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

  const [kpi, setKpi] = useState({ commandes: 0, alertes: 0, nlp: 0 });
  const [commandes, setCommandes] = useState<CommandeLigne[]>([]);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const [modalId, setModalId] = useState<number | null>(null);
  const [modalStatut, setModalStatut] = useState("En attente");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (token) chargerDonnees(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

      {/* Modal statut */}
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
          <a href="#" className="nav-item actif" onClick={(e) => e.preventDefault()}>
            <i className="fa-solid fa-gauge-high" />
            Indicateurs
          </a>
          <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
            <i className="fa-solid fa-cash-register" />
            Commandes
          </a>
          <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
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
tbody td { padding:10px 12px; color:#1E293B; }
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
.btn-annuler { width:100%; background:transparent; border:1.5px solid #BFDBFE; color:#64748B; border-radius:10px; padding:10px; font-size:12px; font-weight:600; cursor:pointer; margin-top:8px; }
#toast { position:fixed; bottom:24px; right:24px; background:#fff; border:1.5px solid #BFDBFE; border-left:4px solid #1D4ED8; color:#1E293B; padding:12px 18px; border-radius:10px; font-size:12px; font-weight:600; z-index:200; box-shadow:0 8px 24px rgba(29,78,216,.14); transform:translateY(80px); opacity:0; transition:all .32s; }
#toast.show { transform:translateY(0); opacity:1; }
`;
