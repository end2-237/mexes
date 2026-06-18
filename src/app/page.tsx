/**
 * ZONE VITRINE — ESPACE RÉSERVÉ
 * ===================================================================
 * Cette page est l'emplacement réservé du futur SITE VITRINE.
 * Le site vitrine de Clé Minutes n'a volontairement PAS été converti :
 * il sera intégré ici ultérieurement (marketing, présentation, etc.).
 *
 * En production multi-hosting (voir middleware.ts) :
 *   - le DOMAINE racine (ex: cleminutes.cm)   → sert cette zone vitrine
 *   - le SOUS-DOMAINE (ex: app.cleminutes.cm) → sert /dashboard
 * ===================================================================
 */
export default function VitrinePlaceholder() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#1D4ED8 0%,#2563EB 50%,#3B82F6 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "44px 38px",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(72,110,215,.25)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: 16,
            background: "#EFF6FF",
            borderRadius: 18,
            marginBottom: 18,
          }}
        >
          <i className="fa-solid fa-key" style={{ fontSize: 32, color: "#1D4ED8" }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1E293B" }}>Clé Minutes</h1>
        <p style={{ color: "#64748B", marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
          Emplacement réservé au <strong>site vitrine</strong>.
          <br />
          Cette zone est prête pour une future intégration marketing.
        </p>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            marginTop: 24,
            background: "linear-gradient(135deg,#1D4ED8,#3B82F6)",
            color: "#fff",
            padding: "12px 22px",
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 18px rgba(59,130,246,.4)",
          }}
        >
          Accéder au dashboard <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6 }} />
        </a>
        <p style={{ color: "#94A3B8", marginTop: 18, fontSize: 11 }}>
          Sur Vercel : domaine racine → vitrine · sous-domaine <code>app.</code> → dashboard
        </p>
      </div>
    </main>
  );
}
