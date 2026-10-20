// Deploy DB ↔ Beehiiv. Beehiiv is the source of truth for the newsletter list;
// public.subscribers is the synced copy (with consent records) that the access rules check.
//
// POST /functions/v1/beehiiv   (signed-in user's JWT in Authorization)
//   { "action": "check" }        sync this user's status from Beehiiv, return { subscribed }
//   { "action": "subscribe" }    push this user's (already consented) subscription to Beehiiv
//   { "action": "unsubscribe" }  unsubscribe in Beehiiv and locally
//
// Secrets (supabase secrets set): BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are provided by the platform.

import { createClient } from "jsr:@supabase/supabase-js@2";

const BEEHIIV = "https://api.beehiiv.com/v2";
const KEY = Deno.env.get("BEEHIIV_API_KEY") ?? "";
const PUB = Deno.env.get("BEEHIIV_PUBLICATION_ID") ?? "";
const ALLOWED = ["https://deploytlv.com", "http://localhost:4320"];

function cors(origin: string | null) {
  const o = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

async function bh(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BEEHIIV}/publications/${PUB}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 200) }; }
  return { status: r.status, body };
}
const ACTIVE = new Set(["active", "validating", "pending"]);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!KEY || !PUB) return json({ error: "Beehiiv isn't connected yet" }, 503, origin);

  // who is calling (verified JWT → verified email)
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u, error: ue } = await userClient.auth.getUser();
  const email = u?.user?.email?.toLowerCase();
  if (ue || !email || !u.user.email_confirmed_at) return json({ error: "sign in first" }, 401, origin);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let action = "check";
  try { action = (await req.json())?.action ?? "check"; } catch { /* default */ }
  const enc = encodeURIComponent(email);

  const { data: local } = await admin.from("subscribers").select("status, name, consent_at").eq("email", email).maybeSingle();

  if (action === "subscribe") {
    // Only after the person ticked the consent box (recorded by the subscribe() RPC).
    if (!local || local.status !== "subscribed" || !local.consent_at) return json({ error: "consent required" }, 400, origin);
    const r = await bh("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        email,
        reactivate_existing: true,          // they just re-consented on the page
        send_welcome_email: true,
        double_opt_override: "off",         // the sign-in link already verified the address
        utm_source: "deploy-db",
        utm_medium: "website",
        referring_site: "deploytlv.com/db",
      }),
    });
    if (r.status >= 300) return json({ error: "beehiiv", status: r.status }, 502, origin);
    await admin.from("subscribers").update({ synced_at: new Date().toISOString() }).eq("email", email);
    return json({ subscribed: true, beehiiv: r.body?.data?.status ?? null }, 200, origin);
  }

  if (action === "unsubscribe") {
    const r = await bh(`/subscriptions/by_email/${enc}`, { method: "PUT", body: JSON.stringify({ unsubscribe: true }) });
    if (r.status >= 300 && r.status !== 404) return json({ error: "beehiiv", status: r.status }, 502, origin);
    await admin.from("subscribers").update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString(), synced_at: new Date().toISOString() }).eq("email", email);
    return json({ subscribed: false }, 200, origin);
  }

  // check: Beehiiv decides; mirror it locally.
  const r = await bh(`/subscriptions/by_email/${enc}`);
  if (r.status === 404) {
    // Not in Beehiiv. If they consented on our page but the push failed earlier, push now.
    if (local?.status === "subscribed" && local.consent_at) {
      const p = await bh("/subscriptions", { method: "POST", body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: true, double_opt_override: "off", utm_source: "deploy-db", referring_site: "deploytlv.com/db" }) });
      if (p.status < 300) await admin.from("subscribers").update({ synced_at: new Date().toISOString() }).eq("email", email);
      return json({ subscribed: true }, 200, origin);
    }
    return json({ subscribed: false }, 200, origin);
  }
  if (r.status >= 300) return json({ subscribed: local?.status === "subscribed", degraded: true }, 200, origin);

  const st = r.body?.data?.status as string | undefined;
  const now = new Date().toISOString();
  if (st && ACTIVE.has(st)) {
    if (!local) {
      // Subscribed through Beehiiv (a form, the newsletter page, an import): give them access.
      await admin.from("subscribers").insert({ email, user_id: u.user.id, status: "subscribed", consent_at: now, consent_text: "Subscribed to the Deploy Log via Beehiiv", source: "beehiiv", synced_at: now });
    } else if (local.status !== "subscribed") {
      await admin.from("subscribers").update({ status: "subscribed", unsubscribed_at: null, synced_at: now }).eq("email", email);
    }
    return json({ subscribed: true }, 200, origin);
  }
  // inactive / invalid / needs_attention / paused → no access
  if (local?.status === "subscribed") {
    await admin.from("subscribers").update({ status: "unsubscribed", unsubscribed_at: now, synced_at: now }).eq("email", email);
  }
  return json({ subscribed: false, beehiiv: st ?? null }, 200, origin);
});
