#!/usr/bin/env node
/* Deploy DB importer. Runs locally with the service-role key from .env.local. Never runs in the browser.

   node build/db/import.mjs members --dry-run   build the allowlist from Luma exports and show counts only
   node build/db/import.mjs members              upsert members + create their sign-in accounts
   node build/db/import.mjs entries <dir>        upsert entries from a folder of <id>.json files
   node build/db/import.mjs images <dir>         upload entry photos (img/*.jpg) to the private bucket
   node build/db/import.mjs approve <email>      approve an access request: add as member + create account

   Member emails are personal data: the generated list is written to build/db/private/ (gitignored)
   and is never printed in full.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = path.resolve(ROOT, "../Deploy Website");           // main checkout, holds exports/ (local only)
const PRIVATE = path.join(ROOT, "build/db/private");

function env() {
  const out = {};
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}
const E = env();
const URL_ = E.SUPABASE_URL, KEY = E.SUPABASE_SERVICE_ROLE_KEY;
function need() { if (!URL_ || !KEY) { console.error("Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first (see SETUP-deploy-db.md)."); process.exit(1); } }
const H = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });

async function rest(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 200) {
    const r = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: { ...H(), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(i, i + 200)),
    });
    if (!r.ok) throw new Error(`${table} upsert failed: ${r.status} ${await r.text()}`);
  }
}

/* ---------- CSV (handles quoted fields with commas and newlines) ---------- */
function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || "").trim()])));
}

/* ---------- members ---------- */
function collectMembers() {
  const found = new Map();
  const walk = d => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".csv")) {
      let rows; try { rows = parseCSV(fs.readFileSync(p, "utf8")); } catch { continue; }
      if (!rows.length || !("email" in rows[0])) continue;
      const hasStatus = "approval_status" in rows[0];
      for (const r of rows) {
        const email = (r.email || "").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
        if (hasStatus && r.approval_status && r.approval_status !== "approved") continue;
        const name = r.name || [r.first_name, r.last_name].filter(Boolean).join(" ");
        if (!found.has(email)) found.set(email, { email, name: name || null, source: "luma" });
      }
    }
  } };
  walk(path.join(SITE, "exports"));
  const extra = path.join(PRIVATE, "extra-members.csv");     // optional: email,name,source  (Academy, manual adds)
  if (fs.existsSync(extra)) for (const r of parseCSV(fs.readFileSync(extra, "utf8"))) {
    const email = (r.email || "").toLowerCase(); if (email.includes("@")) found.set(email, { email, name: r.name || null, source: r.source || "manual" });
  }
  return [...found.values()];
}

async function createAccount(email) {
  const r = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: { ...H(), "Content-Type": "application/json" },
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (r.ok) return "created";
  const t = await r.text();
  if (r.status === 422 || /already/i.test(t)) return "exists";
  throw new Error(`account for one member failed: ${r.status} ${t.slice(0, 120)}`);
}

async function members(dry) {
  const list = collectMembers();
  fs.mkdirSync(PRIVATE, { recursive: true });
  fs.writeFileSync(path.join(PRIVATE, "members.json"), JSON.stringify(list, null, 1));
  const by = list.reduce((a, m) => (a[m.source] = (a[m.source] || 0) + 1, a), {});
  console.log(`members found: ${list.length}`, by, `(list saved to build/db/private/members.json, gitignored)`);
  if (dry) return;
  need();
  await rest("members", list.map(m => ({ email: m.email, name: m.name, source: m.source })), "email");
  let created = 0, existed = 0;
  for (const m of list) { (await createAccount(m.email)) === "created" ? created++ : existed++; }
  console.log(`members upserted: ${list.length} · sign-in accounts created: ${created} · already existed: ${existed}`);
}

/* ---------- entries ---------- */
const FIELDS = { id: 1, type: 1, title: 1, body: 1, answer: 1, who: 1, date: 1, week: 1, tags: 1, link: 1, linkLabel: "link_label", image: 1, imageAlt: "image_alt", status: 1, time: 1 };
async function entries(dir) {
  need();
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  const rows = files.map(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); const d = j.data || j; d.id = d.id || j.id || f.replace(/\.json$/, "");
    const o = {}; for (const [k, v] of Object.entries(FIELDS)) if (d[k] !== undefined) o[v === 1 ? k : v] = d[k];
    if (o.image) o.image = o.image.replace(/^img\//, "");
    if (o.link && !o.link.startsWith("https://")) delete o.link;
    o.who = o.who || []; o.tags = o.tags || [];
    const full = {}; for (const [k, v] of Object.entries(FIELDS)) { const col = v === 1 ? k : v; full[col] = o[col] === undefined ? null : o[col]; }
    full.who = o.who; full.tags = o.tags;
    return full;
  });
  await rest("entries", rows, "id");
  console.log(`entries upserted: ${rows.length}`);
}

/* ---------- images ---------- */
async function images(dir) {
  need();
  let n = 0;
  for (const f of fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f))) {
    const r = await fetch(`${URL_}/storage/v1/object/entry-images/${encodeURIComponent(f)}`, {
      method: "POST", headers: { ...H(), "Content-Type": "image/jpeg", "x-upsert": "true" }, body: fs.readFileSync(path.join(dir, f)),
    });
    if (!r.ok) throw new Error(`upload ${f} failed: ${r.status} ${await r.text()}`);
    n++;
  }
  console.log(`images uploaded to the private bucket: ${n}`);
}

/* ---------- approve an access request ---------- */
async function approve(email) {
  need(); email = (email || "").toLowerCase();
  if (!email.includes("@")) { console.error("usage: approve <email>"); process.exit(1); }
  const q = await fetch(`${URL_}/rest/v1/access_requests?email=eq.${encodeURIComponent(email)}&select=name&order=created_at.desc&limit=1`, { headers: H() });
  const req = (await q.json())[0];
  await rest("members", [{ email, name: req?.name || null, source: "approved" }], "email");
  await createAccount(email);
  await fetch(`${URL_}/rest/v1/access_requests?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
  console.log("approved: they can now sign in with that email.");
}

const [cmd, arg] = process.argv.slice(2);
const run = { members: () => members(arg === "--dry-run"), entries: () => entries(arg), images: () => images(arg), approve: () => approve(arg) }[cmd];
if (!run) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]); process.exit(1); }
run().catch(e => { console.error(String(e.message || e)); process.exit(1); });
