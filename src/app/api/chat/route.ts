export const dynamic = "force-dynamic";
import { handler, json, ApiError } from "@/lib/http";
import { sql } from "@/lib/db";
import { repondreMessage } from "@/lib/chatbot";

// POST /api/chat — répond à un message et mémorise la session (port de chatbot.py)
export const POST = handler(async (req) => {
  const { message, history = [], service = null, session_id = null, canal = "web" } =
    (await req.json()) || {};
  if (!message) throw new ApiError(422, "message requis.");

  const reponse = await repondreMessage(message, history);

  const nouvelHistorique = JSON.stringify([
    ...history,
    { role: "user", content: message },
    { role: "assistant", content: reponse },
  ]);

  let sessionId = session_id;
  if (sessionId) {
    await sql`UPDATE chatbot SET history_user = ${nouvelHistorique} WHERE id_session = ${sessionId}`;
  } else {
    const [s] = await sql`
      INSERT INTO chatbot (service, canal, history_user)
      VALUES (${service}, ${canal}, ${nouvelHistorique})
      RETURNING id_session
    `;
    sessionId = s.id_session;
  }

  return json({ response: reponse, session_id: sessionId, success: true });
});
