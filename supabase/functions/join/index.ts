// Deploy community applications (deploytlv.com/join).
//
// POST /functions/v1/join   (public, deployed with --no-verify-jwt)
//   { action: "apply", name, email, phone, linkedin, role, building, stage, tools[], wants[], source{}, hp, ms }
//       screen → store in public.join_applications → email the applicant + Myron.
//       Returns { status: "approved", invite } or { status: "pending" }.
//   { action: "decide", id, decision: "approve"|"decline", sig }
//       one-tap links from Myron's email (they open /db/applicants/, which posts here). sig = HMAC(id).
//   { action: "review", id, decision }   with an admin's JWT in Authorization (the /db/applicants/ page).
//
// Secrets (supabase secrets set): RESEND_API_KEY, RESEND_FROM, JOIN_SECRET, WHATSAPP_INVITE,
// JOIN_NOTIFY_TO (where review emails go). No WHATSAPP_INVITE → nobody is auto-approved.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are provided by the platform.

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("RESEND_FROM") ?? "Deploy TLV <hello@mail.deploytlv.com>";
const TO = Deno.env.get("JOIN_NOTIFY_TO") ?? "hello@deploytlv.com";
const SECRET = Deno.env.get("JOIN_SECRET") ?? "";
const INVITE = Deno.env.get("WHATSAPP_INVITE") ?? "";
const SITE = "https://deploytlv.com";
const ALLOWED = [SITE, "http://localhost:4321", "http://localhost:4320", "http://localhost:3456"];

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
const list = (a: unknown, n: number) => (Array.isArray(a) ? a.map((x) => clip(x, 60)).filter(Boolean).slice(0, n) : []);

/* ---------- signed one-tap links ---------- */
async function sign(id: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
const decideUrl = async (id: string, d: string) => `${SITE}/db/applicants/?id=${id}&a=${d}&sig=${await sign(id)}`;

/* ---------- the screen: what counts as a clear fit ---------- */
const THROWAWAY = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|getnada|sharklasers|dispostable|maildrop)\./i;
function slug(li: string) {
  const s = li.trim().replace(/^https?:\/\//i, "").replace(/^(www\.)?linkedin\.com\/(in\/)?/i, "").replace(/[/?#].*$/, "");
  return s;
}
function screen(a: { name: string; email: string; linkedin: string; role: string; building: string }) {
  const why: string[] = [];
  if (a.role === "other") why.push("Picked “Curious”, not founder or builder");
  if (!/^[\p{L}][\p{L}'’.-]*(\s+[\p{L}'’.-]+)+$/u.test(a.name)) why.push("Name doesn’t look like a full name");
  if (!/^[A-Za-z0-9\-_%.À-￿]{3,100}$/.test(a.linkedin)) why.push("LinkedIn handle looks off");
  if (a.building.length < 15 || a.building.split(/\s+/).length < 3) why.push("Very short answer on what they’re building");
  if (THROWAWAY.test(a.email)) why.push("Throwaway email address");
  if (!INVITE) why.push("No WhatsApp invite link is set yet, so nobody is auto-approved");
  return why;
}

/* ---------- email ---------- */
async function send(to: string, subject: string, html: string, text: string, replyTo?: string) {
  if (!RESEND_API_KEY) { console.error("RESEND_API_KEY not set"); return false; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) console.error("resend failed", r.status, await r.text());
  return r.ok;
}
const shell = (inner: string) =>
  `<div style="background:#f3eedf;padding:28px 16px"><div style="max-width:560px;margin:0 auto;background:#fbf6e8;border:2px solid #11100d;padding:28px;font:16px/1.6 -apple-system,Segoe UI,Helvetica,sans-serif;color:#11100d">
<div style="font:900 15px/1 Arial Black,Arial,sans-serif;letter-spacing:.04em;margin-bottom:20px">DEPLOY <span style="color:#ff5a18">TLV</span></div>${inner}</div></div>`;
const button = (href: string, label: string, bg = "#ff5a18") =>
  `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#11100d;border:2px solid #11100d;padding:12px 20px;font-weight:700;text-decoration:none;margin:4px 8px 4px 0">${esc(label)}</a>`;

function first(name: string) { return name.split(/\s+/)[0]; }

async function emailInvite(row: Record<string, any>) {
  const f = esc(first(row.name));
  const html = shell(`<h1 style="font:900 28px/1.1 Arial Black,Arial,sans-serif;margin:0 0 14px">You're in, ${f}.</h1>
<p style="margin:0 0 18px">Welcome to Deploy, Tel Aviv's English-speaking community of people building with AI. Tap below to join the WhatsApp group.</p>
${button(INVITE, "Join the WhatsApp group →", "#25d366")}
<p style="margin:18px 0 0">When you're in, say hi with one line on what you're building. The group has the next night, the coworking days and the intros.</p>
<p style="margin:18px 0 0;color:#6b6458;font-size:14px">See you in the room,<br>Myron</p>`);
  const text = `You're in, ${first(row.name)}.\n\nJoin the Deploy WhatsApp group: ${INVITE}\n\nSay hi with one line on what you're building.\n\nMyron`;
  const ok = await send(row.email, "You're in: your Deploy WhatsApp invite", html, text, TO);
  if (ok) await admin.from("join_applications").update({ invited_at: new Date().toISOString() }).eq("id", row.id);
  return ok;
}
async function emailReceived(row: Record<string, any>) {
  const html = shell(`<h1 style="font:900 26px/1.1 Arial Black,Arial,sans-serif;margin:0 0 14px">Got it, ${esc(first(row.name))}.</h1>
<p style="margin:0">Thanks for applying to Deploy. Myron reads every application himself, and you'll hear back here, usually within a day.</p>
<p style="margin:18px 0 0;color:#6b6458;font-size:14px">Meanwhile, see what we make: <a href="https://instagram.com/deploytlv" style="color:#c23b05">@deploytlv</a></p>`);
  return send(row.email, "We got your Deploy application", html, `Thanks for applying to Deploy, ${first(row.name)}. You'll hear back here, usually within a day.`, TO);
}
async function emailMyron(row: Record<string, any>) {
  const li = row.linkedin ? `https://www.linkedin.com/in/${row.linkedin}` : "";
  const when = new Date(row.created_at).toLocaleString("en-GB", { timeZone: "Asia/Jerusalem", dateStyle: "medium", timeStyle: "short" });
  const src = row.source || {};
  const from = [src.ref && `ref=${src.ref}`, src.utm_source && `utm=${src.utm_source}`, src.utm_campaign, src.referrer].filter(Boolean).join(" · ") || "direct";
  const rows: [string, string][] = [
    ["Role", row.role], ["Building", row.building || ""], ["Stage", row.stage || ""],
    ["Builds with", (row.tools || []).join(", ")], ["Wants", (row.wants || []).join(", ")],
    ["Email", row.email], ["WhatsApp", row.phone || ""], ["Came from", from], ["When", when],
  ];
  const approved = row.status === "approved";
  const head = approved
    ? `<p style="margin:0 0 14px"><b style="background:#c9f25d;padding:2px 6px">AUTO-APPROVED</b> They got the WhatsApp invite by email.</p>`
    : `<p style="margin:0 0 6px"><b style="background:#8fd3ff;padding:2px 6px">NEEDS YOU</b> Held for review because:</p><ul style="margin:0 0 14px;padding-left:20px">${(row.reasons || []).map((r: string) => `<li>${esc(r)}</li>`).join("")}</ul>`;
  const actions = approved
    ? button(`${SITE}/db/applicants/`, "See all applicants", "#fbf6e8")
    : button(await decideUrl(row.id, "approve"), "Approve + send invite", "#c9f25d") + button(await decideUrl(row.id, "decline"), "Decline", "#fbf6e8");
  const html = shell(`<h1 style="font:900 24px/1.15 Arial Black,Arial,sans-serif;margin:0 0 12px">${esc(row.name)}</h1>${head}
${li ? `<p style="margin:0 0 14px"><a href="${esc(li)}" style="color:#c23b05;font-weight:700">LinkedIn: ${esc(row.linkedin)} ↗</a></p>` : ""}
<table style="border-collapse:collapse;font-size:15px">${rows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:5px 16px 5px 0;color:#6b6458;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:5px 0">${esc(v)}</td></tr>`).join("")}</table>
<div style="margin-top:20px">${actions}</div>
<p style="margin:16px 0 0;color:#6b6458;font-size:13px">Reply to this email to write to ${esc(first(row.name))} directly. All applicants: deploytlv.com/db/applicants/</p>`);
  const text = `${row.name} (${approved ? "auto-approved" : "needs review: " + (row.reasons || []).join("; ")})\n` +
    (li ? `LinkedIn: ${li}\n` : "") + rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    (approved ? "" : `\n\nApprove: ${await decideUrl(row.id, "approve")}\nDecline: ${await decideUrl(row.id, "decline")}`);
  const subject = approved ? `Join: ✅ ${clip(row.name, 50)} (${row.role}) is in` : `Join: review ${clip(row.name, 50)} (${row.role})`;
  return send(TO, subject, html, text, row.email);
}

/* ---------- decisions ---------- */
async function decide(id: string, decision: string, by: string) {
  const { data: row } = await admin.from("join_applications").select("*").eq("id", id).maybeSingle();
  if (!row) return { error: "not found", code: 404 };
  if (decision === "approve") {
    if (!INVITE) return { error: "Set the WhatsApp invite link first (WHATSAPP_INVITE secret).", code: 409 };
    const { data: upd } = await admin.from("join_applications")
      .update({ status: "approved", decided_by: by, decided_at: new Date().toISOString() }).eq("id", id).select("*").single();
    const sent = row.invited_at ? true : await emailInvite(upd);   // never double-send
    return { status: "approved", name: row.name, invited: sent, already: !!row.invited_at };
  }
  await admin.from("join_applications")
    .update({ status: "declined", decided_by: by, decided_at: new Date().toISOString() }).eq("id", id);
  return { status: "declined", name: row.name };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  const b = await req.json().catch(() => ({}));

  if (b.action === "apply") {
    // bots: a filled honeypot or a form finished in under 4 seconds gets a polite fake answer
    if (b.hp || (typeof b.ms === "number" && b.ms < 4000)) return json({ status: "pending" }, 200, origin);
    const a = {
      name: clip(b.name, 120).replace(/\s+/g, " "),
      email: clip(b.email, 200).toLowerCase(),
      phone: clip(b.phone, 40),
      linkedin: slug(clip(b.linkedin, 200)),
      role: ["founder", "builder", "other"].includes(b.role) ? b.role : "other",
      building: clip(b.building, 400),
      stage: clip(b.stage, 60),
      tools: list(b.tools, 12),
      wants: list(b.wants, 12),
      source: typeof b.source === "object" && b.source ? Object.fromEntries(Object.entries(b.source).slice(0, 8).map(([k, v]) => [clip(k, 30), clip(v, 300)])) : {},
    };
    if (!/^\S+@\S+\.\S+$/.test(a.email) || a.name.length < 2) return json({ error: "Check your name and email." }, 400, origin);
    if (a.phone && !a.phone.startsWith("+")) a.phone = "+972 " + a.phone.replace(/^0/, "");

    // the same person again: approved before → same answer and the invite again; within 10 min → no new row
    const { data: prev } = await admin.from("join_applications").select("id,status,created_at,invited_at")
      .eq("email", a.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (prev?.status === "approved" && INVITE) return json({ status: "approved", invite: INVITE }, 200, origin);
    if (prev && Date.now() - new Date(prev.created_at).getTime() < 10 * 60 * 1000) return json({ status: prev.status === "approved" ? "approved" : "pending", ...(prev.status === "approved" && INVITE ? { invite: INVITE } : {}) }, 200, origin);

    const reasons = screen(a);
    if (prev?.status === "declined") reasons.push("Applied before and was declined");
    const status = reasons.length ? "pending" : "approved";
    const { data: row, error } = await admin.from("join_applications")
      .insert({ ...a, status, reasons, decided_by: status === "approved" ? "auto" : null, decided_at: status === "approved" ? new Date().toISOString() : null })
      .select("*").single();
    if (error) { console.error("insert failed", error); return json({ error: "That didn't go through. Try again in a minute." }, 500, origin); }

    // emails run after the answer is ready; a failed email never loses the application
    const jobs = [emailMyron(row), status === "approved" ? emailInvite(row) : emailReceived(row)];
    // @ts-ignore EdgeRuntime is provided by Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(Promise.all(jobs)); else await Promise.all(jobs);
    return json(status === "approved" ? { status, invite: INVITE } : { status }, 200, origin);
  }

  if (b.action === "decide") {
    if (!SECRET || !b.id || !["approve", "decline"].includes(b.decision)) return json({ error: "bad request" }, 400, origin);
    if (b.sig !== await sign(String(b.id))) return json({ error: "This link isn't valid." }, 403, origin);
    const r = await decide(String(b.id), b.decision, "email link");
    return json(r, (r as any).code ?? 200, origin);
  }

  if (b.action === "review") {
    const auth = req.headers.get("Authorization") ?? "";
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ok } = await anon.rpc("is_admin");
    const { data: { user } } = await anon.auth.getUser();
    if (!ok || !user) return json({ error: "forbidden" }, 403, origin);
    if (!b.id || !["approve", "decline"].includes(b.decision)) return json({ error: "bad request" }, 400, origin);
    const r = await decide(String(b.id), b.decision, user.email ?? "admin");
    return json(r, (r as any).code ?? 200, origin);
  }

  return json({ error: "unknown action" }, 400, origin);
});
