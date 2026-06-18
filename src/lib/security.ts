import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

/**
 * Sécurité — port de app/core/security.py
 * ------------------------------------------------------------
 * bcrypt pour le hachage des mots de passe, JWT HS256 (jose) pour
 * les tokens, et génération d'OTP à 6 chiffres.
 */

const SECRET_KEY = process.env.SECRET_KEY || "changez-en-production";
const ALGORITHM = "HS256";
const TOKEN_EXPIRE_HOURS = parseInt(process.env.TOKEN_EXPIRE_HOURS || "24", 10);

const encodedKey = new TextEncoder().encode(SECRET_KEY);

// ── Mots de passe ──────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  if (!hashed) return false;
  return bcrypt.compare(plain, hashed);
}

// ── JWT ────────────────────────────────────────────────────
export type JwtPayload = {
  sub: string;
  email?: string;
  nom?: string;
  role?: string;
  [key: string]: unknown;
};

export async function createAccessToken(data: JwtPayload): Promise<string> {
  return new SignJWT(data)
    .setProtectedHeader({ alg: ALGORITHM })
    .setExpirationTime(`${TOKEN_EXPIRE_HOURS}h`)
    .sign(encodedKey);
}

/** Vérifie la signature et l'expiration. Lève une erreur si invalide. */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, encodedKey, { algorithms: [ALGORITHM] });
  if (!payload.sub) throw new Error("Token invalide");
  return payload as JwtPayload;
}

// ── OTP ────────────────────────────────────────────────────
export function generateOtp(): number {
  return Math.floor(100000 + Math.random() * 900000);
}
