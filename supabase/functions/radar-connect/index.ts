// Hiring Radar "Connect via Deploy" (deploytlv.com/db/radar/).
//
// POST { company, role_title, role_url, note, linkedin }   (signed-in user's JWT required)
//   → checks the user is an active Deploy Log subscriber, saves a row in public.radar_intros,
//     and emails Myron (reply-to = the member, so a reply goes straight to them).
//   The row is saved first: a failed email never loses a request.
//   Nothing is emailed to the member or to the company: Deploy decides who to introduce.
//
// Secrets (already set for `join`/`house`): RESEND_API_KEY, RESEND_FROM, JOIN_NOTIFY_TO.
// Deploy: supabase functions deploy radar-connect --project-ref ketmhhwpkafgwvpwfukd

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("RESEND_FROM") ?? "Deploy TLV <hello@mail.deploytlv.com>";
const TO = Deno.env.get("JOIN_NOTIFY_TO") ?? "hello@deploytlv.com";
const SITE = "https://deploytlv.com";
const ALLOWED = [SITE, "http://localhost:8766", "http://localhost:4321"];

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
const httpUrl = (s: string) => (/^https?:\/\/\S+$/i.test(s) ? s : "");

type Intro = { id: string; email: string; name: string | null; company: string; role_title: string | null; role_url: string | null; note: string; linkedin: string | null };

async function emailMyron(r: Intro, past: number) {
  if (!RESEND_API_KEY) { console.error("RESEND_API_KEY not set"); return; }
  const who = r.name ? `${r.name} (${r.email})` : r.email;
  const rows: [string, string][] = [
    ["From", who],
    ["Company", r.company],
    ["Role", r.role_title || "Any role / general intro"],
    ["LinkedIn", r.linkedin || "-"],
    ["Earlier requests", String(past)],
  ];
  const link = (v: string) => (/^https?:\/\//.test(v) ? `<a href="${esc(v)}" style="color:#11100d">${esc(v)}</a>` : esc(v));
  const html = `<meta charset="utf-8"><div style="background:#f3eedf;padding:28px 16px"><div style="max-width:560px;margin:0 auto;background:#fbf6e8;border:2px solid #11100d;padding:28px;font:16px/1.6 -apple-system,Segoe UI,Helvetica,sans-serif;color:#11100d">
<div style="font:900 15px/1 Arial Black,Arial,sans-serif;letter-spacing:.04em;margin-bottom:20px">DEPLOY <span style="color:#ff5a18">HIRING RADAR</span></div>
<p style="margin:0 0 14px;font-weight:700">Connect via Deploy: someone wants in at ${esc(r.company)}</p>
<table style="border-collapse:collapse;margin-bottom:14px">${rows.map(([k, v]) => `<tr><td style="padding:3px 14px 3px 0;color:#5f584d;vertical-align:top">${k}</td><td style="padding:3px 0">${k === "LinkedIn" ? link(v) : esc(v)}</td></tr>`).join("")}</table>
${r.role_url ? `<p style="margin:0 0 14px"><a href="${esc(r.role_url)}" style="color:#ff5a18;font-weight:700">See the job post ↗</a></p>` : ""}
<p style="white-space:pre-wrap;margin:0;border-top:2px solid #11100d;padding-top:14px">${esc(r.note)}</p>
<p style="margin:18px 0 0;color:#5f584d;font-size:13px">They agreed Deploy can share their name, email, LinkedIn and this note with people at ${esc(r.company)}. Reply to this email to answer them directly.</p></div></div>`;
  const text = `Connect via Deploy: ${r.company}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n${r.role_url ? `Job: ${r.role_url}\n` : ""}\n${r.note}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], reply_to: r.email, subject: `Radar intro · ${r.company}${r.role_title ? " · " + r.role_title : ""} · ${r.name || r.email}`, html, text }),
  });
  if (!res.ok) { console.error("resend failed", res.status, await res.text()); return; }
  await admin.from("radar_intros").update({ emailed_at: new Date().toISOString() }).eq("id", r.id);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  const email = u?.user?.email?.toLowerCase();
  if (!email) return json({ error: "Sign in first." }, 401, origin);

  const { data: sub } = await admin.from("subscribers").select("name,status").eq("email", email).maybeSingle();
  if (!sub || sub.status !== "subscribed") return json({ error: "Connect via Deploy is for Deploy Log subscribers." }, 403, origin);

  const b = await req.json().catch(() => ({}));
  const r = {
    email,
    name: clip(sub.name, 120) || null,
    company: clip(b.company, 100),
    role_title: clip(b.role_title, 200) || null,
    role_url: httpUrl(clip(b.role_url, 500)) || null,
    note: clip(b.note, 600),
    linkedin: httpUrl(clip(b.linkedin, 300)) || null,
  };
  if (!r.company || r.note.length < 5) return json({ error: "Add a short note so we know how to help." }, 400, origin);

  // limits: the same request twice within 10 minutes = one row; at most 10 requests a day per person
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data: recent } = await admin.from("radar_intros").select("company,role_title,created_at").eq("email", email).gte("created_at", since);
  const dup = (recent ?? []).find((x) => x.company === r.company && (x.role_title ?? null) === r.role_title && Date.now() - new Date(x.created_at).getTime() < 6e5);
  if (dup) return json({ ok: true, email }, 200, origin);
  if ((recent ?? []).length >= 10) return json({ error: "That's 10 requests today. Try again tomorrow." }, 429, origin);
  const { count } = await admin.from("radar_intros").select("id", { count: "exact", head: true }).eq("email", email);

  const { data: row, error } = await admin.from("radar_intros").insert(r).select("id,email,name,company,role_title,role_url,note,linkedin").single();
  if (error) { console.error("insert failed", error); return json({ error: "That didn't go through. Try again in a minute." }, 500, origin); }

  const job = emailMyron(row as Intro, count ?? 0);
  // @ts-ignore EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(job); else await job;
  return json({ ok: true, email }, 200, origin);
});
