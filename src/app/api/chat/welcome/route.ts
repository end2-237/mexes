import { json } from "@/lib/http";

// POST /api/chat/welcome — message d'accueil (port de chat_welcome)
export async function POST() {
  return json({
    message: "👋 Bienvenue chez Clé Minutes ! Je suis KeyBot. Comment puis-je vous aider ?",
  });
}
