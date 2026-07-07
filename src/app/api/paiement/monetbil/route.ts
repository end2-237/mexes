import { handler, json, ApiError } from "@/lib/http";
import { checkAutomationKey } from "@/lib/automation";

export const dynamic = "force-dynamic";

// POST /api/paiement/monetbil — initie un paiement Monetbil et renvoie l'URL du widget.
// Body : { montant, phone?, item_ref?, user?, first_name?, email? }
// Env requis : MONETBIL_SERVICE_KEY.
export const POST = handler(async (req) => {
  checkAutomationKey(req);
  const serviceKey = process.env.MONETBIL_SERVICE_KEY;
  if (!serviceKey) throw new ApiError(500, "MONETBIL_SERVICE_KEY non configuré.");

  const {
    montant,
    phone = "",
    item_ref = `CM-${Date.now()}`,
    user = "",
    first_name = "",
    email = "",
  } = (await req.json()) || {};

  if (!montant || Number(montant) <= 0) throw new ApiError(422, "montant invalide.");

  const params = new URLSearchParams({
    amount: String(montant),
    phone: String(phone),
    item_ref: String(item_ref),
    user: String(user),
    first_name: String(first_name),
    email: String(email),
    currency: "XAF",
  });
  const paymentUrl = `https://api.monetbil.com/widget/v2.1/${serviceKey}?${params.toString()}`;

  return json({
    success: true,
    payment_url: paymentUrl,
    item_ref,
    montant: Number(montant),
    message: `Pour régler ${Number(montant).toLocaleString("fr-CM")} FCFA, ouvrez ce lien sécurisé Monetbil :\n${paymentUrl}`,
  });
});
