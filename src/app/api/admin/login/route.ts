
export const dynamic = "force-dynamic";

import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { verifyPassword, createAccessToken } from "@/lib/security";

// POST /api/admin/login — connexion administrateur (port de login_admin)
export const POST = handler(async (req) => {
  const { email_admin, password } = (await req.json()) || {};
  if (!email_admin || !password)
    throw new ApiError(422, "email_admin et password requis.");

  const [admin] = await sql`
    SELECT * FROM admin WHERE email_admin = ${email_admin} LIMIT 1
  `;
  if (!admin || !(await verifyPassword(password, admin.password)))
    throw new ApiError(401, "Identifiants administrateur incorrects.");

  const access_token = await createAccessToken({
    sub: String(admin.id_admin),
    role: "admin",
  });

  return json({
    access_token,
    token_type: "bearer",
    admin: { nom: admin.nom_admin, email: admin.email_admin },
  });
});
