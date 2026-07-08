#!/usr/bin/env node
/**
 * Push the members-portal datasets into Supabase `portal_docs` (RLS: approved
 * members only). This replaces committing members/data/*.js to the public
 * repo — run it after `parse-chat.mjs` or whenever the curated data changes.
 *
 * Reads (all local-only / gitignored):
 *   members/data/{people,stack,resources,pulse,meta}.js
 *   events/2/data1.js + data2.js   (matchmaking signals, tag/cluster colors)
 *
 * Run:  SUPABASE_ACCESS_TOKEN=sbp_… node build/push-portal-data.mjs
 *  or:  node build/push-portal-data.mjs --sql
 *       → writes build/portal-docs-seed.sql (gitignored) to paste into the
 *         dashboard SQL editor instead.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const PROJECT_REF = 'uzloavbzhebsoizkxheb';

function evalGlobals(files) {
  const win = {};
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) {
      console.error(`missing ${f} — run the pipeline that generates it first`);
      process.exit(1);
    }
    new Function('window', fs.readFileSync(p, 'utf8'))(win);
  }
  return win;
}

const { MEM } = evalGlobals([
  'members/data/people.js',
  'members/data/stack.js',
  'members/data/resources.js',
  'members/data/pulse.js',
  'members/data/meta.js',
]);
const { D2 } = evalGlobals(['events/2/data1.js', 'events/2/data2.js']);

const docs = {
  people: MEM.people,
  stack: MEM.stack,
  resources: MEM.resources,
  pulse: MEM.pulse,
  meta: MEM.meta,
  // only the relational bits the portal uses — not the full attendee dossiers
  d2: { matches: D2.matches ?? [], tagColors: D2.tagColors ?? {}, clusterDefs: D2.clusterDefs ?? [] },
};

const upsert = (key, data) =>
  `insert into public.portal_docs (key, data) values ('${key}', '${
    JSON.stringify(data).replace(/'/g, "''")
  }'::jsonb)\non conflict (key) do update set data = excluded.data, updated_at = now();`;

if (process.argv.includes('--sql')) {
  const out = path.join(ROOT, 'build', 'portal-docs-seed.sql');
  fs.writeFileSync(out, Object.entries(docs).map(([k, d]) => upsert(k, d)).join('\n\n') + '\n');
  console.log(`wrote ${out} — paste into the dashboard SQL editor (do NOT commit it)`);
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('set SUPABASE_ACCESS_TOKEN=sbp_… (management API), or use --sql for the dashboard');
  process.exit(1);
}

for (const [key, data] of Object.entries(docs)) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: upsert(key, data) }),
  });
  if (!res.ok) {
    console.error(`push '${key}' failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log(`pushed portal_docs['${key}'] (${JSON.stringify(data).length.toLocaleString()} bytes)`);
}
console.log('done — portal reads this live; no site deploy needed');
