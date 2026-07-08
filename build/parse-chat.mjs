#!/usr/bin/env node
/*
 * Deploy TLV — Members Portal data pipeline
 * Reads build/source/_chat.txt + the event databases, resolves identities via
 * identity-map.json, and emits members/data/*.js (window.MEM.* globals).
 *
 * Re-run after re-exporting the chat or editing identity-map.json:
 *   node build/parse-chat.mjs
 *
 * NOTE: build/source/_chat.txt is gitignored (sensitive). Generated member-tier
 * data files are committed; owner-tier sensitive content is handled separately.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const p = (...a) => join(ROOT, ...a);

// ---------- helpers ----------
// strip bidi/direction marks, then normalize exotic spaces (incl. U+202F narrow
// no-break space, which WhatsApp inserts after the "~" in non-contact names) to
// a plain space so identity-map keys match.
const strip = (s) => (s || '')
  .replace(/[‎‏‪-‮⁦-⁩]/g, '')
  .replace(/[     ﻿]/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

// ---------- 1. load event rosters ----------
function loadD2() {
  const win = {};
  const code =
    readFileSync(p('events/2/data1.js'), 'utf8') + '\n' +
    readFileSync(p('events/2/data2.js'), 'utf8');
  new Function('window', code)(win);
  return win.D2;
}

function extractArray(src, varName) {
  const start = src.indexOf(`const ${varName} = `);
  if (start < 0) throw new Error(`array ${varName} not found`);
  const open = src.indexOf('[', start);
  let depth = 0, i = open, inStr = false, q = '', esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === q) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  const arrText = src.slice(open, i);
  return new Function(`return (${arrText});`)();
}

function loadD1() {
  // attendees moved from index.html into the gitignored plaintext bundle
  // when the portal was encrypted (see build/encrypt-portal.js)
  const src = readFileSync(p('events/1/data.js'), 'utf8');
  return extractArray(src, 'attendees');
}

// normalize a profile photo path to be relative to members/
function normPhoto(photo, eventNum) {
  if (!photo) return null;
  if (photo.startsWith('../1/')) return '../events/1/' + photo.slice('../1/'.length);
  if (photo.startsWith('photos/')) return `../events/${eventNum}/` + photo;
  return photo;
}

// ---------- 2. build canonical people registry ----------
const d1 = loadD1();
const D2 = loadD2();
const d2 = [...(D2.newAttendees || []), ...(D2.alumni || [])];

const people = new Map(); // name -> record
function upsert(name, src, tier, eventNum) {
  let rec = people.get(name);
  if (!rec) {
    rec = { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            tiers: [], photo: null, profile: {}, chat: null };
    people.set(name, rec);
  }
  if (!rec.tiers.includes(tier)) rec.tiers.push(tier);
  // d2 profile is richer; let it overwrite d1 where present
  const richer = eventNum === 2;
  const fields = ['project', 'tagline', 'stack', 'revenue', 'seeking', 'cluster',
                  'insight', 'building', 'bg', 'collab', 'website', 'linkedin'];
  for (const f of fields) {
    if (src[f] == null) continue;
    if (rec.profile[f] == null || richer) rec.profile[f] = src[f];
  }
  const photo = normPhoto(src.photo, eventNum);
  if (photo && (!rec.photo || richer)) rec.photo = photo;
}
for (const a of d1) upsert(a.name, a, 'd1', 1);
for (const a of d2) upsert(a.name, a, 'd2', 2);

// name lookup that tolerates spacing/case
const byName = new Map([...people.keys()].map((n) => [n.toLowerCase(), n]));

// ---------- 3. parse chat ----------
const raw = readFileSync(p('build/source/_chat.txt'), 'utf8');
const START = /^‎?\[(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})\] (.+?): ([\s\S]*)$/;
const lines = raw.split(/\r?\n/);
const msgs = [];
let cur = null;
for (const line of lines) {
  const probe = line.replace(/^‎/, '');
  const m = probe.match(/^\[(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})\] (.+?): ([\s\S]*)$/);
  if (m) {
    if (cur) msgs.push(cur);
    const [, dd, mm, yyyy, h, mi, s, sender, body] = m;
    cur = {
      date: `${yyyy}-${mm}-${dd}`,
      ts: new Date(+yyyy, +mm - 1, +dd, +h, +mi, +s).getTime(),
      sender: strip(sender),
      body: body,
    };
  } else if (cur) {
    cur.body += '\n' + line;
  }
}
if (cur) msgs.push(cur);

// ---------- 4. classify ----------
const SYS = [
  'requested to join', 'joined using', 'was added', 'added you', ' added ',
  'left', 'removed', 'changed their phone number', "changed this group's",
  'turned on admin approval', 'created group', 'end-to-end encrypted',
  "You're now an admin", 'pinned a message', 'deleted this message',
  'This message was deleted', 'changed the subject', 'changed to',
  'changed the group', "changed the group's", 'now an admin', 'security code',
];
const idMap = JSON.parse(readFileSync(p('build/identity-map.json'), 'utf8'));
const resolve = (sender) => {
  if (idMap[sender] && idMap[sender] !== '_comment') return idMap[sender];
  if (byName.has(sender.toLowerCase())) return byName.get(sender.toLowerCase());
  return null; // unattributed
};

const URL_RE = /(https?:\/\/[^\s]+)/g;
const ATTACH_RE = /<attached:\s*([^>]+)>/i;

const joinEvents = []; // {date}
const resources = [];
const realMsgs = [];
let resId = 0;

for (const msg of msgs) {
  const cleanBody = strip(msg.body.replace(/<This message was edited>/gi, ''));
  const isSys = SYS.some((kw) => cleanBody.includes(kw)) || msg.sender === 'DeployTLV';
  if ((cleanBody.includes('requested to join') || cleanBody.includes('joined using')))
    joinEvents.push({ date: msg.date });
  if (isSys) continue;

  const person = resolve(msg.sender);
  const attach = msg.body.match(ATTACH_RE);
  const urls = (cleanBody.match(URL_RE) || []).map((u) => u.replace(/[)\].,>"']+$/, ''));

  realMsgs.push({ ...msg, cleanBody, person, urls, attach: attach ? strip(attach[1]) : null });

  // resources: links
  for (const url of urls) {
    let host = '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }
    if (host.includes('whatsapp')) continue;
    resources.push({
      id: ++resId, type: classifyUrl(host, url), url, host,
      title: host, sharedBy: person, date: msg.date,
      context: snippet(cleanBody.replace(/https?:\/\/[^\s]+/g, '').trim()),
    });
  }
  // resources: shared docs (pdf/files, not photos/videos)
  if (attach) {
    const fn = strip(attach[1]);
    if (/\.(pdf|docx?|pptx?|xlsx?|csv|zip)$/i.test(fn)) {
      resources.push({
        id: ++resId, type: 'doc', file: fn,
        title: fn.replace(/^\d+-/, ''), sharedBy: person, date: msg.date,
        context: snippet(cleanBody.replace(ATTACH_RE, '').replace(/•.*$/, '').trim()),
      });
    }
  }
}

function classifyUrl(host, url) {
  if (host.includes('github.com')) return 'repo';
  if (host.includes('apps.apple.com') || host.includes('play.google.com')) return 'app';
  if (host.includes('luma.com') || host.includes('lu.ma')) return 'event';
  if (host.includes('fillout.com') || host.includes('forms.')) return 'form';
  if (host.includes('x.com') || host.includes('twitter.com') || host.includes('linkedin.com') || host.includes('instagram.com')) return 'post';
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'video';
  if (host.includes('huggingface.co')) return 'model';
  return 'link';
}
function snippet(s, n = 140) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ---------- 5. tech radar ----------
const TOOLS = [
  ['Claude Code', /claude code/i, 'Coding assistants'],
  ['Claude', /\bclaude\b/i, 'Models'],
  ['Codex', /\bcodex\b/i, 'Coding assistants'],
  ['Cursor', /\bcursor\b/i, 'Coding assistants'],
  ['OpenCode', /open\s?code/i, 'Coding assistants'],
  ['Windsurf', /windsurf/i, 'Coding assistants'],
  ['Replit', /replit/i, 'Coding assistants'],
  ['Lovable', /lovable/i, 'Coding assistants'],
  ['Bolt', /\bbolt\.new\b|\bbolt\b/i, 'Coding assistants'],
  ['OpenClaw', /open\s?claw/i, 'Agent runtimes'],
  ['Hermes', /\bhermes\b/i, 'Agent runtimes'],
  ['NanoClaw', /nano\s?claw/i, 'Agent runtimes'],
  ['ChatGPT', /chat\s?gpt/i, 'Models'],
  ['Gemini', /\bgemini\b/i, 'Models'],
  ['Grok', /\bgrok\b/i, 'Models'],
  ['Perplexity', /perplexity/i, 'Models'],
  ['Midjourney', /midjourney/i, 'Visual / media'],
  ['ComfyUI', /comfy\s?ui/i, 'Visual / media'],
  ['Obsidian', /\bobsidian\b/i, 'Knowledge / notes'],
  ['Notion', /\bnotion\b/i, 'Knowledge / notes'],
  ['Telegram', /\btelegram\b/i, 'Infra / messaging'],
  ['Slack', /\bslack\b/i, 'Infra / messaging'],
  ['Discord', /\bdiscord\b/i, 'Infra / messaging'],
  ['Hostinger', /hostinger/i, 'Infra / messaging'],
  ['Railway', /railway/i, 'Infra / messaging'],
  ['n8n', /\bn8n\b/i, 'Infra / messaging'],
  ['Zapier', /zapier/i, 'Infra / messaging'],
  ['Supabase', /supabase/i, 'Infra / messaging'],
];
const stack = TOOLS.map(([tool, re, category]) => {
  let inProfiles = 0; const profileChampions = new Set();
  for (const rec of people.values()) {
    const st = rec.profile.stack || [];
    if (st.some((s) => re.test(s) || s.toLowerCase() === tool.toLowerCase())) {
      inProfiles++; profileChampions.add(rec.name);
    }
  }
  let mentions = 0; const chatChampions = new Set();
  for (const m of realMsgs) {
    if (re.test(m.cleanBody)) {
      mentions++;
      if (m.person) chatChampions.add(m.person);
    }
  }
  return { tool, category, inProfiles, mentions,
           champions: [...new Set([...profileChampions, ...chatChampions])].sort() };
}).filter((t) => t.inProfiles > 0 || t.mentions > 0)
  .sort((a, b) => (b.inProfiles + b.mentions) - (a.inProfiles + a.mentions));

// ---------- 6. pulse ----------
const byDayMap = new Map();
const contribMap = new Map();
for (const m of realMsgs) {
  byDayMap.set(m.date, (byDayMap.get(m.date) || 0) + 1);
  if (m.person) contribMap.set(m.person, (contribMap.get(m.person) || 0) + 1);
}
const byDay = [...byDayMap.entries()].map(([date, count]) => ({ date, count }))
  .sort((a, b) => a.date.localeCompare(b.date));
const topContributors = [...contribMap.entries()]
  .map(([name, messages]) => ({ name, messages }))
  .sort((a, b) => b.messages - a.messages);

const joinByDay = new Map();
for (const j of joinEvents) joinByDay.set(j.date, (joinByDay.get(j.date) || 0) + 1);
let cum = 0;
const growth = [...joinByDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  .map(([date, n]) => ({ date, members: (cum += n) }));

// ---------- 6b. curated pulse feed ----------
// build/pulse-curation.json is hand-edited (see its _comment). The parser only
// validates + merges it; judgment about what's "interesting" stays human/Claude.
let curation = { items: [], highlights: [] };
try {
  curation = JSON.parse(readFileSync(p('build/pulse-curation.json'), 'utf8'));
} catch {
  console.warn('pulse: no build/pulse-curation.json — feed will be empty');
}
const feed = (curation.items || [])
  .map((it) => ({ ...it, highlight: (curation.highlights || []).includes(it.id) }))
  .sort((a, b) => b.date.localeCompare(a.date));
for (const it of feed) {
  if (it.sharedBy && !people.has(it.sharedBy))
    console.warn(`pulse feed: "${it.id}" sharedBy "${it.sharedBy}" not in registry (renders unlinked)`);
}

// candidates report: link/doc messages not yet covered by the curated feed,
// so the next curation pass is a diff instead of a re-read.
const curatedUrls = new Set(feed.map((i) => (i.url || '').replace(/\/$/, '')).filter(Boolean));
const lastCurated = feed[0]?.date || '0000-00-00';
const candidates = realMsgs.filter((m) =>
  (m.urls.length || m.attach) &&
  (m.date > lastCurated || !m.urls.some((u) => curatedUrls.has(u.replace(/\/$/, '')))));
writeFileSync(p('build/pulse-candidates.md'),
  `# Pulse curation candidates (auto-generated by parse-chat.mjs)\n\n` +
  `Link/attachment messages not matched to a curated item URL, or newer than the newest curated item (${lastCurated}).\n` +
  `Review, add the interesting ones to build/pulse-curation.json, re-run the build.\n\n` +
  candidates.map((m) =>
    `- **${m.date}** ${m.person || m.sender}: ${snippet(m.cleanBody, 160)}${m.attach ? ` [attached: ${m.attach}]` : ''}`
  ).join('\n') + '\n');

// ---------- 7. attach per-person chat stats ----------
for (const m of realMsgs) {
  if (!m.person) continue;
  const rec = people.get(m.person);
  if (!rec) continue;
  if (!rec.chat) rec.chat = { messages: 0, firstSeen: m.date, lastSeen: m.date,
                              tools: new Set(), links: 0 };
  rec.chat.messages++;
  rec.chat.lastSeen = m.date;
  if (m.date < rec.chat.firstSeen) rec.chat.firstSeen = m.date;
  rec.chat.links += m.urls.length;
  for (const [tool, re] of TOOLS) if (re.test(m.cleanBody)) rec.chat.tools.add(tool);
}

// ---------- 8. emit ----------
const peopleOut = [...people.values()]
  .map((r) => ({ ...r, chat: r.chat ? { ...r.chat, tools: [...r.chat.tools] } : null }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Profile edits members made in the Deploy HQ app win over parsed data.
// build/profile-overrides.json is regenerated by build/pull-app-profiles.mjs.
try {
  const { overrides } = JSON.parse(readFileSync(p('build/profile-overrides.json'), 'utf8'));
  let applied = 0;
  for (const person of peopleOut) {
    if (overrides[person.slug]) {
      person.profile = { ...person.profile, ...overrides[person.slug] };
      applied++;
    }
  }
  console.log(`profiles: applied app-sourced overrides for ${applied} member(s)`);
} catch {
  console.warn('profiles: no build/profile-overrides.json — run build/pull-app-profiles.mjs to sync app edits');
}

const meta = {
  version: peopleOut.length,
  builtFrom: { messagesTotal: msgs.length, realMessages: realMsgs.length,
               attributed: realMsgs.filter((m) => m.person).length,
               senders: new Set(msgs.map((m) => m.sender)).size },
  tierCounts: {
    d1: peopleOut.filter((p) => p.tiers.includes('d1')).length,
    d2: peopleOut.filter((p) => p.tiers.includes('d2')).length,
    community: peopleOut.filter((p) => p.tiers.includes('community')).length,
    total: peopleOut.length,
  },
  dateRange: { from: byDay[0]?.date, to: byDay.at(-1)?.date },
  resources: resources.length,
  // no password hints here — meta.js is committed and served publicly
};

const banner = (name) => `/* AUTO-GENERATED by build/parse-chat.mjs — do not edit by hand. */\nwindow.MEM = window.MEM || {};\n`;
const emit = (file, varName, data) =>
  writeFileSync(p('members/data', file),
    banner() + `window.MEM.${varName} = ${JSON.stringify(data, null, 1)};\n`);

emit('people.js', 'people', peopleOut);
emit('stack.js', 'stack', stack);
emit('resources.js', 'resources', resources);
emit('pulse.js', 'pulse', { byDay, topContributors, growth, feed });
emit('meta.js', 'meta', meta);

// ---------- report ----------
console.log('— Members pipeline —');
console.log('people:', peopleOut.length,
            '(d1', meta.tierCounts.d1, '· d2', meta.tierCounts.d2, ')');
console.log('messages:', msgs.length, 'total ·', realMsgs.length, 'real ·',
            meta.builtFrom.attributed, 'attributed');
console.log('with chat activity:', peopleOut.filter((p) => p.chat).length, 'people');
console.log('resources:', resources.length, '· stack tools:', stack.length);
console.log('pulse feed:', feed.length, 'curated items ·', candidates.length, 'candidates → build/pulse-candidates.md');
console.log('date range:', meta.dateRange.from, '→', meta.dateRange.to);
console.log('top 8 contributors:', topContributors.slice(0, 8)
            .map((c) => `${c.name}(${c.messages})`).join(', '));
