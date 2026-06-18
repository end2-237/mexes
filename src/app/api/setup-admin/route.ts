import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/security";

// POST /api/setup-admin — crée le premier administrateur (port de main.py:setup_admin_direct)
export const POST = handler(async (req) => {
  const body = await req.json();
  const { nom_admin = "admin", email, password } = body || {};
  if (!email || !password) throw new ApiError(422, "email et password requis.");

  const existing = await sql`SELECT email_admin FROM admin LIMIT 1`;
  if (existing.length > 0) {
    return json({
      success: false,
      message: `Admin déjà existant : ${existing[0].email_admin}`,
      action: "Connectez-vous sur le dashboard avec cet email",
    });
  }

  const hashed = await hashPassword(password);
  const rows = await sql`
    INSERT INTO admin (nom_admin, email_admin, password, decision)
    VALUES (${nom_admin}, ${email}, ${hashed}, ${"Aucune décision pour l'instant."})
    RETURNING id_admin
  `;

  return json({
    success: true,
    message: "✅ Admin créé avec succès !",
    email,
    id_admin: rows[0].id_admin,
    prochaine_etape: "Ouvrez le dashboard",
  });
});
