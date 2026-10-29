// Deploy House enquiries: the "Get in touch" form on deploytlv.com/residency/.
//
// POST { name, email, company, interest, message, source{}, hp, ms }
//   → saves a row in public.house_enquiries and emails Myron (reply-to = the visitor).
//   The row is saved first: a failed email never loses an enquiry.
//   Nothing is emailed to the visitor (a public form must not send mail to any address typed in).
//
// Secrets (already set for `join`): RESEND_API_KEY, RESEND_FROM, JOIN_NOTIFY_TO.
// Deploy: supabase functions deploy house --project-ref ketmhhwpkafgwvpwfukd --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("RESEND_FROM") ?? "Deploy TLV <hello@mail.deploytlv.com>";
const TO = Deno.env.get("JOIN_NOTIFY_TO") ?? "hello@deploytlv.com";
const SITE = "https://deploytlv.com";
const ALLOWED = [SITE, "http://localhost:4321", "http://localhost:4388", "http://localhost:3456"];
const INTERESTS = ["Founding patron", "Brand partner", "Distribution partner", "Joining as a founder", "Something else"];

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

async function emailMyron(r: { id: string; name: string; email: string; company: string; interest: string; message: string }) {
  if (!RESEND_API_KEY) { console.error("RESEND_API_KEY not set"); return; }
  const rows = [["Name", r.name], ["Email", r.email], ["Company", r.company || "-"], ["Interested in", r.interest]];
  const html = `<meta charset="utf-8"><div style="background:#f3eedf;padding:28px 16px"><div style="max-width:560px;margin:0 auto;background:#fbf6e8;border:2px solid #11100d;padding:28px;font:16px/1.6 -apple-system,Segoe UI,Helvetica,sans-serif;color:#11100d">
<div style="font:900 15px/1 Arial Black,Arial,sans-serif;letter-spacing:.04em;margin-bottom:20px">DEPLOY <span style="color:#ff5a18">HOUSE</span></div>
<p style="margin:0 0 14px;font-weight:700">New enquiry from deploytlv.com/residency</p>
<table style="border-collapse:collapse;margin-bottom:14px">${rows.map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#5f584d">${k}</td><td style="padding:3px 0">${esc(v)}</td></tr>`).join("")}</table>
<p style="white-space:pre-wrap;margin:0;border-top:2px solid #11100d;padding-top:14px">${esc(r.message || "(no message)")}</p>
<p style="margin:18px 0 0;color:#5f584d;font-size:13px">Reply to this email to answer ${esc(r.name)} directly.</p></div></div>`;
  const text = `New enquiry from deploytlv.com/residency\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${r.message || "(no message)"}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], reply_to: r.email, subject: `Deploy House · ${r.interest} · ${r.name}${r.company ? " · " + r.company : ""}`, html, text }),
  });
  if (!res.ok) { console.error("resend failed", res.status, await res.text()); return; }
  await admin.from("house_enquiries").update({ emailed_at: new Date().toISOString() }).eq("id", r.id);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  const b = await req.json().catch(() => ({}));

  // bots: a filled honeypot or a form finished in under 3 seconds gets a polite fake answer
  if (b.hp || (typeof b.ms === "number" && b.ms < 3000)) return json({ ok: true }, 200, origin);
  const e = {
    name: clip(b.name, 120).replace(/\s+/g, " "),
    email: clip(b.email, 200).toLowerCase(),
    company: clip(b.company, 120),
    interest: INTERESTS.includes(b.interest) ? b.interest : "Something else",
    message: clip(b.message, 4000),
    source: typeof b.source === "object" && b.source ? Object.fromEntries(Object.entries(b.source).slice(0, 8).map(([k, v]) => [clip(k, 30), clip(v, 300)])) : {},
  };
  if (!/^\S+@\S+\.\S+$/.test(e.email) || e.name.length < 2) return json({ error: "Check your name and email." }, 400, origin);

  // the same person pressing send twice within 10 minutes: one row
  const { data: prev } = await admin.from("house_enquiries").select("id,created_at")
    .eq("email", e.email).eq("interest", e.interest).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (prev && Date.now() - new Date(prev.created_at).getTime() < 10 * 60 * 1000) return json({ ok: true }, 200, origin);

  const { data: row, error } = await admin.from("house_enquiries").insert(e).select("id,name,email,company,interest,message").single();
  if (error) { console.error("insert failed", error); return json({ error: "That didn't go through. Try again in a minute." }, 500, origin); }

  const job = emailMyron(row);
  // @ts-ignore EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(job); else await job;
  return json({ ok: true }, 200, origin);
});
