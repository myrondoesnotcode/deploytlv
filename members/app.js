/* Deploy TLV — Members Intelligence portal (brand-light theme)
   Gate: Supabase magic link (same login as the Deploy HQ app). Data: loaded
   after sign-in from Supabase behind RLS — portal_docs (people snapshot, stack,
   resources, pulse, meta, event-2 matchmaking) with live `profiles` edits
   overlaid by slug, so app edits show here instantly. */
const { useState, useEffect, useMemo } = React;

/* ── supabase ── */
const SUPABASE_URL = "https://uzloavbzhebsoizkxheb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bG9hdmJ6aGVic29pemt4aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDEyNjAsImV4cCI6MjA5OTAxNzI2MH0.J0Aa8FYCVQYUddvDEbeN_0yNYweYs_nupsQu1MLLlnk";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── theme tokens ── */
const BG = "#F4EDD7", BG_OFF = "#EBE3C8", CARD = "#FBF7E8";
const INK = "#111111", MUTED = "#6B6557", FAINT = "#A49B7E";
const BORDER = "#DDD3B0", ACCENT = "#F5D400", GOLD = "#8A6D00", BLACK = "#0A0A0A";
const MONO = "'IBM Plex Mono','Courier New',monospace";
const BARLOW = "'Barlow Condensed',Impact,sans-serif";

/* ── data (module vars, filled by loadPortal() before <App/> renders) ── */
let PEOPLE = [], STACK = [], RESOURCES = [];
let PULSE = { byDay: [], topContributors: [], growth: [], feed: [] };
let META = {};
let OWNER = false; // memberships.member_no === 1
let MATCHES = [], TAG_COLORS = {}, CLUSTER_COLOR = {};

const personByName = name => PEOPLE.find(p => p.name === name);

/* ── auth + data loading ── */
// Fields members can edit in the app — live values win over the snapshot
// (same merge the old sync-profiles workflow did in people.js).
const APP_EDITABLE = ["project", "tagline", "seeking", "building", "bg", "linkedin", "website", "stack"];

// Complete a magic-link landing. Handles every shape the email template can
// produce: ?token_hash= (custom template), ?code= (PKCE), #access_token=
// (implicit ConfirmationURL). Returns an error message or null.
async function completeSignInFromUrl() {
  const url = new URL(window.location.href);
  const qs = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const tokenHash = qs.get("token_hash") || hash.get("token_hash");
  const code = qs.get("code");
  const access = hash.get("access_token"), refresh = hash.get("refresh_token");
  const landed = tokenHash || code || access || hash.get("error_description");
  if (!landed) return null;
  let msg = null;
  if (tokenHash) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    msg = error ? error.message : null;
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    msg = error ? error.message : null;
  } else if (access && refresh) {
    const { error } = await sb.auth.setSession({ access_token: access, refresh_token: refresh });
    msg = error ? error.message : null;
  } else {
    msg = hash.get("error_description");
  }
  window.history.replaceState({}, "", url.pathname); // scrub tokens from URL/history
  return msg;
}

function applyDocs(docs, liveRows) {
  PEOPLE = docs.people || [];
  STACK = docs.stack || [];
  RESOURCES = docs.resources || [];
  PULSE = docs.pulse || { byDay: [], topContributors: [], growth: [], feed: [] };
  META = docs.meta || {};
  const d2 = docs.d2 || {};
  MATCHES = d2.matches || [];
  TAG_COLORS = d2.tagColors || {};
  CLUSTER_COLOR = {};
  (d2.clusterDefs || []).forEach(d => { CLUSTER_COLOR[d.name] = d.color; });

  // Overlay live app edits by slug; members not in the snapshot get a card too.
  const bySlug = new Map(PEOPLE.filter(p => p.slug).map(p => [p.slug, p]));
  (liveRows || []).forEach(row => {
    const o = {};
    APP_EDITABLE.forEach(f => {
      const v = row[f];
      if (v != null && v !== "" && (!Array.isArray(v) || v.length)) o[f] = v;
    });
    const p = bySlug.get(row.slug);
    if (p) {
      if (Object.keys(o).length) p.profile = { ...(p.profile || {}), ...o };
    } else if (row.name) {
      PEOPLE.push({ name: row.name, slug: row.slug, tiers: ["community"], photo: null, profile: o, chat: null });
    }
  });
}

// Returns {ok:true} or {ok:false, applicationStatus?, error?}.
async function loadPortal() {
  // Idempotent: materializes the profile + approved membership for recognized
  // emails, so members who never opened the app can still get in here.
  let claim = null;
  try {
    const { data } = await sb.functions.invoke("claim");
    claim = data;
  } catch (e) { /* older deploy without CORS — membership check below decides */ }

  const { data: ms, error: mErr } = await sb.from("memberships").select("member_no,status");
  if (mErr) return { ok: false, error: mErr.message };
  const approved = (ms || []).filter(m => m.status === "approved");
  if (!approved.length) return { ok: false, applicationStatus: claim && claim.applicationStatus };
  OWNER = approved.some(m => m.member_no === 1);

  const [docsRes, liveRes] = await Promise.all([
    sb.from("portal_docs").select("key,data"),
    sb.from("profiles").select("slug,name," + APP_EDITABLE.join(",")).not("slug", "is", null),
  ]);
  if (docsRes.error) return { ok: false, error: docsRes.error.message };
  const docs = {};
  (docsRes.data || []).forEach(r => { docs[r.key] = r.data; });
  applyDocs(docs, liveRes.data);
  return { ok: true };
}

async function signOut() {
  await sb.auth.signOut();
  window.location.reload();
}

/* ── helpers ── */
function fmtDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1];
  return `${mon} ${+d}`;
}
function tierList(p) {
  const t = [];
  if (p.tiers.includes("d1")) t.push(["D#1", "#C99A2E"]);
  if (p.tiers.includes("d2")) t.push(["D#2", GOLD]);
  if (p.tiers.includes("community") && !p.tiers.includes("d1") && !p.tiers.includes("d2"))
    t.push(["COMMUNITY", MUTED]);
  return t;
}
const revLabel = rev => (rev === "Revenue" || (rev && rev.startsWith("$"))) ? "Revenue" : "Pre-Revenue";
const revStyle = rev => revLabel(rev) === "Revenue" ? { background: ACCENT, color: BLACK } : { background: "#EADFBC", color: "#8C8163" };

/* ── shared components ── */
function Avatar({ a, size }) {
  const initials = (a.name || "").split(" ").slice(0, 2).map(w => w[0]).join("");
  return (
    <div style={{
      position: "relative", width: size, height: size, flexShrink: 0,
      background: "#EFE7CB", border: "1px solid " + BORDER,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#B6A773", fontWeight: 700, fontSize: size * 0.3, letterSpacing: 1
    }}>
      {initials}
      {a.photo && (
        <img src={a.photo} alt={a.name}
          onError={e => { e.currentTarget.style.display = "none"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
      )}
    </div>
  );
}
function Label({ children, mt }) {
  return (
    <div className="barlow" style={{
      display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800,
      color: GOLD, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, marginTop: mt == null ? 18 : mt
    }}>
      <span style={{ width: 8, height: 8, background: ACCENT, display: "inline-block" }} />{children}
    </div>
  );
}
function Badge({ text, bg, color, border }) {
  return (
    <span className="barlow" style={{
      background: bg || "transparent", color: color || INK,
      border: border ? "1px solid " + border : "none", fontSize: 10, fontWeight: 800,
      letterSpacing: 1.5, padding: "2px 7px", textTransform: "uppercase", whiteSpace: "nowrap"
    }}>{text}</span>
  );
}
function Chips({ items, max, color }) {
  const shown = max ? items.slice(0, max) : items;
  const extra = max && items.length > max ? items.length - max : 0;
  return (
    <div>
      {shown.map((t, i) => (
        <span key={i} style={{ display: "inline-block", background: "#fff", border: "1px solid " + BORDER, color: color || MUTED, fontSize: 10, padding: "2px 7px", marginRight: 4, marginTop: 4 }}>{t}</span>
      ))}
      {extra > 0 && <span style={{ display: "inline-block", background: "#fff", border: "1px solid " + BORDER, color: FAINT, fontSize: 10, padding: "2px 7px", marginTop: 4 }}>+{extra}</span>}
    </div>
  );
}
function TierBadges({ p }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {tierList(p).map(([t, c]) => <Badge key={t} text={t} border={c} color={c} />)}
    </div>
  );
}

/* ── App ── */
function App() {
  const [tab, setTab] = useState("people");
  const [selected, setSelected] = useState(null);

  const tabs = [["people", "People"], ["stack", "Deploy Stack"], ["resources", "Resources"], ["pulse", "Pulse"]];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: MONO, color: INK }}>
      {/* HEADER */}
      <div style={{ background: BG, borderBottom: "1px solid " + BORDER, padding: "16px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 10 }}>
        <div className="barlow" style={{ display: "flex", alignItems: "flex-end", fontWeight: 900, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>
          <span>Deploy&nbsp;TLV</span><span style={{ color: ACCENT, fontSize: 28, lineHeight: 0.7 }}>_</span>
          <span style={{ fontSize: 14, color: MUTED, letterSpacing: 3, marginLeft: 10, marginBottom: 3 }}>MEMBERS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {OWNER && <Badge text="● Owner View" bg={INK} color={ACCENT} />}
          <span style={{ color: MUTED, fontSize: 11, letterSpacing: 1 }}>{PEOPLE.length} MEMBERS · TLV</span>
          <button onClick={signOut} className="barlow" style={{
            background: "none", border: "1px solid " + BORDER, color: MUTED, fontSize: 10,
            fontWeight: 700, letterSpacing: 1.5, padding: "4px 8px", cursor: "pointer", textTransform: "uppercase"
          }}>Sign out</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", padding: "0 14px", borderBottom: "1px solid " + BORDER, overflowX: "auto", background: BG }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="barlow" style={{
            background: "none", border: "none", color: tab === k ? INK : FAINT,
            fontSize: 13, fontWeight: 800, letterSpacing: 2, padding: "13px 16px", cursor: "pointer",
            textTransform: "uppercase", whiteSpace: "nowrap",
            borderBottom: tab === k ? "2px solid " + ACCENT : "2px solid transparent", outline: "none"
          }}>{label}</button>
        ))}
      </div>

      {tab === "people" && <PeopleTab setSelected={setSelected} />}
      {tab === "stack" && <StackTab setSelected={setSelected} />}
      {tab === "resources" && <ResourcesTab setSelected={setSelected} />}
      {tab === "pulse" && <PulseTab setSelected={setSelected} />}

      {selected && <PersonModal p={selected} setSelected={setSelected} />}
    </div>
  );
}

/* ── PEOPLE ── */
function PeopleTab({ setSelected }) {
  const [seg, setSeg] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("active");

  const segs = [
    ["all", "All", PEOPLE.length],
    ["event", "Been to an event", PEOPLE.filter(p => p.tiers.includes("d1") || p.tiers.includes("d2")).length],
    ["d2", "Deploy #2", PEOPLE.filter(p => p.tiers.includes("d2")).length],
    ["d1", "Deploy #1", PEOPLE.filter(p => p.tiers.includes("d1")).length],
    ["chat", "Active in chat", PEOPLE.filter(p => p.chat).length],
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = PEOPLE.filter(p => {
      const inSeg =
        seg === "all" ? true :
        seg === "event" ? (p.tiers.includes("d1") || p.tiers.includes("d2")) :
        seg === "chat" ? !!p.chat :
        p.tiers.includes(seg);
      if (!inSeg) return false;
      if (!q) return true;
      const prof = p.profile || {};
      return p.name.toLowerCase().includes(q) ||
        (prof.project || "").toLowerCase().includes(q) ||
        (prof.tagline || "").toLowerCase().includes(q) ||
        (prof.stack || []).join(" ").toLowerCase().includes(q) ||
        (p.chat ? (p.chat.tools || []).join(" ").toLowerCase().includes(q) : false);
    });
    list.sort((a, b) => {
      if (sort === "active") {
        const am = a.chat ? a.chat.messages : -1, bm = b.chat ? b.chat.messages : -1;
        if (bm !== am) return bm - am;
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [seg, search, sort]);

  return (
    <React.Fragment>
      <div style={{ padding: "14px 16px 8px", borderBottom: "1px solid " + BORDER }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH NAME, PROJECT, TOOL, OR KEYWORD..."
          style={{ background: "#fff", border: "1px solid " + BORDER, color: INK, padding: "11px 14px", fontSize: 12, width: "100%", outline: "none", fontFamily: "inherit", letterSpacing: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid " + BORDER, alignItems: "center" }}>
        {segs.map(([k, label, n]) => {
          const on = seg === k;
          return (
            <button key={k} onClick={() => setSeg(k)} className="barlow" style={{
              background: on ? ACCENT : "#fff", border: "1px solid " + (on ? ACCENT : BORDER),
              color: on ? BLACK : MUTED, fontSize: 11, fontWeight: 700, padding: "5px 10px",
              cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap", textTransform: "uppercase"
            }}>{label} ({n})</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => setSort(sort === "active" ? "az" : "active")} className="barlow" style={{
          background: "#fff", border: "1px solid " + BORDER, color: MUTED, fontSize: 11, fontWeight: 700,
          padding: "5px 10px", cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap", textTransform: "uppercase"
        }}>sort: {sort === "active" ? "most active" : "a–z"}</button>
      </div>
      <div style={{ padding: "8px 16px 0", color: MUTED, fontSize: 11 }}>{filtered.length} shown</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12, padding: 16 }}>
        {filtered.map(p => {
          const prof = p.profile || {};
          return (
            <div key={p.name} className="d2-card" style={{ padding: 16 }} onClick={() => setSelected(p)}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                <Avatar a={p} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 6 }}>
                    <TierBadges p={p} />
                    {prof.revenue && <Badge text={revLabel(prof.revenue)} bg={revStyle(prof.revenue).background} color={revStyle(prof.revenue).color} />}
                  </div>
                  <div className="barlow" style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.05 }}>{p.name}</div>
                  {prof.project && <div className="barlow" style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{prof.project}</div>}
                </div>
              </div>
              {prof.tagline && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 6 }}>{prof.tagline}</div>}
              {prof.stack && prof.stack.length > 0 && <Chips items={prof.stack} max={3} />}
              {p.chat && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed " + BORDER, fontSize: 11, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: ACCENT }}>●</span>
                  <span><b style={{ color: INK }}>{p.chat.messages}</b> msgs in chat
                    {p.chat.tools && p.chat.tools.length > 0 && <span style={{ color: FAINT }}> · {p.chat.tools.slice(0, 3).join(", ")}</span>}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </React.Fragment>
  );
}

/* ── DEPLOY STACK (tech radar) ── */
function StackTab({ setSelected }) {
  const cats = useMemo(() => {
    const m = new Map();
    STACK.forEach(t => { if (!m.has(t.category)) m.set(t.category, []); m.get(t.category).push(t); });
    return [...m.entries()];
  }, []);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>The Deploy Stack</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>WHAT THE COMMUNITY BUILDS WITH · FROM PROFILES + CHAT MENTIONS · CLICK A CHAMPION TO VIEW</div>
      </div>
      {cats.map(([cat, tools]) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <div className="barlow" style={{ fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{cat}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {tools.map(t => (
              <div key={t.tool} className="d2-flat" style={{ padding: 14, borderLeft: "3px solid " + ACCENT }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span className="barlow" style={{ fontSize: 18, fontWeight: 900 }}>{t.tool}</span>
                  <span style={{ fontSize: 10, color: FAINT, letterSpacing: 1 }}>
                    {t.inProfiles > 0 && <span>{t.inProfiles} stacks</span>}
                    {t.inProfiles > 0 && t.mentions > 0 && " · "}
                    {t.mentions > 0 && <span>{t.mentions} mentions</span>}
                  </span>
                </div>
                {t.champions && t.champions.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {t.champions.slice(0, 8).map(name => {
                      const p = personByName(name);
                      return (
                        <span key={name} onClick={() => p && setSelected(p)} className="barlow" style={{
                          background: "#fff", border: "1px solid " + BORDER, color: p ? INK : FAINT,
                          fontSize: 10.5, fontWeight: 700, padding: "2px 7px", letterSpacing: 0.5,
                          cursor: p ? "pointer" : "default", whiteSpace: "nowrap"
                        }}>{name}</span>
                      );
                    })}
                    {t.champions.length > 8 && <span style={{ fontSize: 10, color: FAINT, alignSelf: "center" }}>+{t.champions.length - 8}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── RESOURCES ── */
const RES_TYPES = {
  repo: ["Repos", "#6E5494"], app: ["Apps", "#2E7D32"], post: ["Posts", "#1DA1F2"],
  doc: ["Docs & Guides", "#C0392B"], form: ["Forms", "#8A6D00"], event: ["Events", "#E67E22"],
  model: ["Models", "#16A085"], video: ["Videos", "#C0392B"], link: ["Links", MUTED],
};
function ResourcesTab({ setSelected }) {
  const [type, setType] = useState("all");
  const counts = useMemo(() => {
    const c = {}; RESOURCES.forEach(r => { c[r.type] = (c[r.type] || 0) + 1; }); return c;
  }, []);
  const list = type === "all" ? RESOURCES : RESOURCES.filter(r => r.type === type);
  const types = Object.keys(RES_TYPES).filter(t => counts[t]);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>Shared Resources</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>EVERY LINK, REPO, APP & GUIDE DROPPED IN THE CHAT · {RESOURCES.length} TOTAL</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setType("all")} className="barlow" style={chipBtn(type === "all")}>All ({RESOURCES.length})</button>
        {types.map(t => (
          <button key={t} onClick={() => setType(t)} className="barlow" style={chipBtn(type === t, RES_TYPES[t][1])}>{RES_TYPES[t][0]} ({counts[t]})</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
        {list.map(r => {
          const meta = RES_TYPES[r.type] || RES_TYPES.link;
          const sharer = r.sharedBy ? personByName(r.sharedBy) : null;
          const inner = (
            <React.Fragment>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Badge text={meta[0]} bg={meta[1]} color="#fff" />
                <span style={{ fontSize: 10, color: FAINT }}>{fmtDate(r.date)}</span>
              </div>
              <div className="barlow" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.15, marginBottom: 4, wordBreak: "break-word" }}>{r.title}{r.url ? " ↗" : ""}</div>
              {r.context && <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.5, marginBottom: 6 }}>{r.context}</div>}
              <div style={{ fontSize: 10.5, color: FAINT }}>
                {r.sharedBy ? <span>shared by <span onClick={e => { if (sharer) { e.preventDefault(); e.stopPropagation(); setSelected(sharer); } }} style={{ color: sharer ? GOLD : FAINT, cursor: sharer ? "pointer" : "default" }}>{r.sharedBy}</span></span> : <span>shared in chat</span>}
              </div>
            </React.Fragment>
          );
          return r.url
            ? <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="d2-card" style={{ padding: 14, textDecoration: "none", color: INK, display: "block" }}>{inner}</a>
            : <div key={r.id} className="d2-flat" style={{ padding: 14 }}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
function chipBtn(on, color) {
  return { background: on ? (color || ACCENT) : "#fff", border: "1px solid " + (on ? (color || ACCENT) : BORDER),
    color: on ? "#fff" : MUTED, fontSize: 11, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
    letterSpacing: 1, whiteSpace: "nowrap", textTransform: "uppercase" };
}

/* ── PULSE ── */
const FEED_TYPES = {
  launch: { emoji: "🚀", label: "Launch", color: "#8A6D00", bg: "#F5D400" },
  event: { emoji: "📅", label: "Event", color: "#FFFFFF", bg: "#0A0A0A" },
  discussion: { emoji: "💬", label: "Hot Topic", color: "#5A4A00", bg: "#EADFBC" },
  link: { emoji: "🔗", label: "Worth a Click", color: "#6B6557", bg: "#FFFFFF" },
  doc: { emoji: "📎", label: "Resource", color: "#6B6557", bg: "#FFFFFF" },
  intro: { emoji: "👋", label: "New Builder", color: "#0A5C36", bg: "#D7E8D0" },
  ask: { emoji: "📣", label: "Ask", color: "#7A1F1F", bg: "#F3D9D0" },
};
const FEED_FILTERS = [
  ["all", "All"], ["launch", "🚀 Launches"], ["discussion", "💬 Hot Topics"],
  ["link", "🔗 Links"], ["event", "📅 Events"], ["intro", "👋 Intros"], ["ask", "📣 Asks"],
];
const todayISO = () => new Date().toISOString().slice(0, 10);

function SharedBy({ name, setSelected }) {
  if (!name) return null;
  const p = personByName(name);
  return (
    <span onClick={e => { if (p) { e.stopPropagation(); setSelected(p); } }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: p ? "pointer" : "default" }}>
      {p && <Avatar a={p} size={18} />}
      <span style={{ fontSize: 11, fontWeight: 700, color: p ? GOLD : MUTED, textDecoration: p ? "underline" : "none", textUnderlineOffset: 2 }}>{name}</span>
    </span>
  );
}

function FeedCard({ it, setSelected, big }) {
  const t = FEED_TYPES[it.type] || FEED_TYPES.link;
  const upcoming = it.eventDate && it.eventDate >= todayISO();
  const open = () => { if (it.url) window.open(it.url, "_blank", "noopener"); };
  let host = "";
  try { host = it.url ? new URL(it.url).hostname.replace(/^www\./, "") : ""; } catch {}
  return (
    <div className="d2-flat" onClick={open}
      style={{ padding: big ? 16 : 14, cursor: it.url ? "pointer" : "default", borderTop: big ? "3px solid " + ACCENT : undefined, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Badge text={`${t.emoji} ${t.label}`} bg={t.bg} color={t.color} border={t.bg === "#FFFFFF" ? BORDER : undefined} />
        {upcoming && <Badge text="Upcoming" bg="#0A5C36" color="#fff" />}
        <span style={{ fontSize: 10, color: FAINT, marginLeft: "auto", letterSpacing: 1 }}>{fmtDate(upcoming ? it.eventDate : it.date)}</span>
      </div>
      <div className="barlow" style={{ fontSize: big ? 19 : 16, fontWeight: 900, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: -0.2 }}>{it.title}</div>
      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, flex: 1 }}>{it.blurb}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <SharedBy name={it.sharedBy} setSelected={setSelected} />
        {host && <span className="barlow" style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, color: GOLD, textTransform: "uppercase" }}>{host} ↗</span>}
      </div>
    </div>
  );
}

function PulseTab({ setSelected }) {
  const [filter, setFilter] = useState("all");
  const feed = PULSE.feed || [];
  const highlights = feed.filter(f => f.highlight);
  const rest = feed.filter(f => !f.highlight || filter !== "all");
  const shown = filter === "all" ? rest : rest.filter(f => f.type === filter || (filter === "link" && f.type === "doc"));

  const byDay = PULSE.byDay || [];
  const maxDay = Math.max(1, ...byDay.map(d => d.count));
  const contrib = PULSE.topContributors || [];
  const maxC = Math.max(1, ...contrib.map(c => c.messages));
  const bf = META.builtFrom || {};
  const anon = (bf.realMessages || 0) - (bf.attributed || 0);
  const totalMsgs = bf.realMessages || byDay.reduce((s, d) => s + d.count, 0);
  const busiest = byDay.slice().sort((a, b) => b.count - a.count)[0];

  const stats = [
    ["Messages", totalMsgs],
    ["Launches", feed.filter(f => f.type === "launch").length],
    ["Active members", PEOPLE.filter(p => p.chat).length],
    ["Resources shared", RESOURCES.length],
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>Community Pulse</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>WHAT THE COMMUNITY IS SHIPPING, SHARING & ARGUING ABOUT</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 20 }}>
        {stats.map(([k, v]) => (
          <div key={k} className="d2-flat" style={{ padding: 14 }}>
            <div className="barlow" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>{k}</div>
          </div>
        ))}
      </div>

      {highlights.length > 0 && filter === "all" && (
        <React.Fragment>
          <Label mt={0}>Highlights</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginBottom: 20 }}>
            {highlights.map(it => <FeedCard key={it.id} it={it} setSelected={setSelected} big />)}
          </div>
        </React.Fragment>
      )}

      <Label mt={0}>The Feed</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {FEED_FILTERS.map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} className="barlow" style={{
            border: "1px solid " + (filter === k ? BLACK : BORDER), background: filter === k ? BLACK : "transparent",
            color: filter === k ? ACCENT : MUTED, fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
            padding: "5px 10px", textTransform: "uppercase", cursor: "pointer"
          }}>{lbl}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10, marginBottom: 24 }}>
        {shown.map(it => <FeedCard key={it.id} it={it} setSelected={setSelected} />)}
        {shown.length === 0 && <div style={{ fontSize: 12, color: FAINT, padding: 20 }}>Nothing here yet.</div>}
      </div>

      {OWNER && <React.Fragment>
      <Label>The Numbers</Label>
      {busiest && <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Busiest day: <b style={{ color: INK }}>{fmtDate(busiest.date)}</b> ({busiest.count} messages)</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90, padding: "0 0 4px", marginBottom: 16, overflowX: "auto" }}>
        {byDay.map(d => (
          <div key={d.date} title={`${d.date}: ${d.count}`} style={{ flex: "1 0 6px", minWidth: 4, height: `${(d.count / maxDay) * 100}%`, background: d.count === maxDay ? ACCENT : "#D8C97E", borderTop: "1px solid " + GOLD }} />
        ))}
      </div>

      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>Top contributors — attributed messages only. {anon > 0 && <span>{anon} more from {OWNER ? "unmatched handles (owner: see roster-gaps)" : "members not yet matched"}.</span>}</div>
      {contrib.slice(0, OWNER ? 30 : 10).map((c, i) => {
        const p = personByName(c.name);
        return (
          <div key={c.name} onClick={() => p && setSelected(p)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, cursor: p ? "pointer" : "default" }}>
            <span className="barlow" style={{ width: 22, textAlign: "right", color: FAINT, fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
            <span style={{ width: 150, fontSize: 12, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
            <div style={{ flex: 1, background: BG_OFF, height: 14 }}>
              <div style={{ width: `${(c.messages / maxC) * 100}%`, height: "100%", background: i === 0 ? ACCENT : "#D8C97E" }} />
            </div>
            <span style={{ width: 32, fontSize: 11, color: MUTED, textAlign: "right" }}>{c.messages}</span>
          </div>
        );
      })}

      {(PULSE.growth || []).length > 0 && (
        <React.Fragment>
          <Label>Membership Growth</Label>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>Cumulative join requests over the window — reached <b style={{ color: INK }}>{PULSE.growth.at(-1).members}</b>.</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90, overflowX: "auto" }}>
            {PULSE.growth.map(g => {
              const top = PULSE.growth.at(-1).members;
              return <div key={g.date} title={`${g.date}: ${g.members} members`} style={{ flex: "1 0 8px", minWidth: 6, height: `${(g.members / top) * 100}%`, background: "#CBB86A" }} />;
            })}
          </div>
        </React.Fragment>
      )}
      </React.Fragment>}
    </div>
  );
}

/* ── PERSON MODAL ── */
function PersonModal({ p, setSelected }) {
  const prof = p.profile || {};
  const mm = MATCHES.filter(m => m.a === p.name || m.b === p.name);
  const websiteHref = prof.website ? (prof.website.startsWith("http") ? prof.website : "https://" + prof.website) : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,8,0.55)", zIndex: 200, overflowY: "auto", padding: 20 }} onClick={() => setSelected(null)}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 600, margin: "0 auto", background: "#FFFDF6", border: "1px solid #C9BE92", borderTop: "4px solid " + ACCENT, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Avatar a={p} size={72} />
            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: 5 }}><TierBadges p={p} /></div>
              <div className="barlow" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>{p.name}</div>
              {prof.project && <div className="barlow" style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>{prof.project}</div>}
            </div>
          </div>
          <button onClick={() => setSelected(null)} className="barlow" style={{ background: "none", border: "1px solid " + BORDER, color: MUTED, padding: "6px 12px", cursor: "pointer", fontSize: 12, letterSpacing: 2 }}>✕ CLOSE</button>
        </div>

        {prof.tagline && <div style={{ fontSize: 13, color: INK, lineHeight: 1.6, marginBottom: 14 }}>{prof.tagline}</div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {prof.revenue && <Badge text={revLabel(prof.revenue)} bg={revStyle(prof.revenue).background} color={revStyle(prof.revenue).color} />}
          {prof.linkedin && <a className="d2-link" href={"https://linkedin.com/in/" + prof.linkedin} target="_blank" rel="noreferrer" style={{ color: MUTED, fontSize: 11, textDecoration: "none", border: "1px solid " + BORDER, padding: "3px 8px", letterSpacing: 1 }}>LINKEDIN ↗</a>}
          {websiteHref && <a className="d2-link" href={websiteHref} target="_blank" rel="noreferrer" style={{ color: MUTED, fontSize: 11, textDecoration: "none", border: "1px solid " + BORDER, padding: "3px 8px", letterSpacing: 1 }}>{prof.website} ↗</a>}
        </div>

        {p.chat && (
          <React.Fragment>
            <Label>Chat Activity</Label>
            <div className="d2-flat" style={{ padding: "12px 14px", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: MUTED }}>
              <span><b className="barlow" style={{ color: INK, fontSize: 18 }}>{p.chat.messages}</b> messages</span>
              <span>active {fmtDate(p.chat.firstSeen)} – {fmtDate(p.chat.lastSeen)}</span>
              {p.chat.links > 0 && <span>{p.chat.links} links shared</span>}
            </div>
            {p.chat.tools && p.chat.tools.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 11, color: FAINT, letterSpacing: 1 }}>WEIGHS IN ON: </span>
                <Chips items={p.chat.tools} />
              </div>
            )}
          </React.Fragment>
        )}

        {prof.insight && (
          <React.Fragment>
            <Label>★ Key Insight</Label>
            <div style={{ background: "#FBF5DC", borderLeft: "3px solid " + ACCENT, padding: "12px 16px", fontSize: 13, lineHeight: 1.7, color: INK }}>{prof.insight}</div>
          </React.Fragment>
        )}
        {prof.building && (<React.Fragment><Label>What They're Building</Label><div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7 }}>{prof.building}</div></React.Fragment>)}
        {prof.bg && (<React.Fragment><Label>Background</Label><div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7 }}>{prof.bg}</div></React.Fragment>)}
        {prof.stack && prof.stack.length > 0 && (<React.Fragment><Label>Stack</Label><Chips items={prof.stack} /></React.Fragment>)}
        {prof.seeking && prof.seeking !== "—" && (<React.Fragment><Label>Seeking</Label><span style={{ display: "inline-block", background: "#fff", border: "1px solid " + BORDER, color: MUTED, fontSize: 12, padding: "4px 10px" }}>{prof.seeking}</span></React.Fragment>)}
        {prof.cluster && prof.cluster.length > 0 && (
          <React.Fragment>
            <Label>Clusters</Label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {prof.cluster.map(c => <Badge key={c} text={c} border={CLUSTER_COLOR[c] || BORDER} color={CLUSTER_COLOR[c] || MUTED} />)}
            </div>
          </React.Fragment>
        )}
        {prof.collab && prof.collab.length > 0 && (
          <React.Fragment>
            <Label>Collaboration Angles</Label>
            {prof.collab.map((c, i) => <div key={i} style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginBottom: 7, display: "flex", gap: 8 }}><span style={{ color: ACCENT, fontWeight: 900 }}>→</span><span>{c}</span></div>)}
          </React.Fragment>
        )}
        {mm.length > 0 && (
          <React.Fragment>
            <Label>Matchmaking Signals</Label>
            {mm.map(m => {
              const otherName = m.a === p.name ? m.b : m.a;
              return (
                <div key={m.rank} className="d2-flat" style={{ padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: GOLD, fontSize: 11 }}>#{m.rank}</span>
                    <Badge text={m.tag} bg={TAG_COLORS[m.tag] || "#888"} color="#fff" />
                  </div>
                  <div className="barlow" style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                    <span style={{ cursor: "pointer", borderBottom: "1px solid " + BORDER }} onClick={() => { const o = personByName(otherName); if (o) setSelected(o); }}>{otherName}</span>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{m.why}</div>
                </div>
              );
            })}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

/* ── LOGIN GATE (magic link) ── */
function GateShell({ children }) {
  return (
    <div id="gate">
      <div id="gate-logo"><span>DE</span></div>
      <h1>Members<span className="dot">.</span></h1>
      <div id="gate-sub">Deploy TLV · Builders Only</div>
      {children}
    </div>
  );
}

function LoginGate({ initialError }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [shake, setShake] = useState(0);

  const fail = msg => { setError("// " + msg); setShake(s => s + 1); };

  async function sendLink() {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) return fail("ENTER YOUR EMAIL");
    setBusy(true); setError("");
    const { error: err } = await sb.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setBusy(false);
    if (err) return fail(err.message.toUpperCase());
    setSent(true);
  }

  async function verifyCode() {
    const t = code.trim();
    if (!t) return fail("PASTE THE CODE FROM THE EMAIL");
    setBusy(true); setError("");
    const { error: err } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: t, type: "email" });
    setBusy(false);
    if (err) return fail("CODE DIDN'T MATCH. TRY AGAIN.");
    window.location.reload(); // boot picks up the session and loads the portal
  }

  const onKey = fn => e => { if (e.key === "Enter") fn(); };

  return (
    <GateShell>
      {!sent ? (
        <div id="gate-form" key={shake} className={shake ? "shake" : ""}>
          <input id="gate-input" type="email" placeholder="your email" autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey(sendLink)} />
          <button id="gate-btn" onClick={sendLink} disabled={busy}>{busy ? "SENDING…" : "SEND LOGIN LINK →"}</button>
          <div id="gate-error">{error}</div>
          <div id="gate-note">Members sign in with the same email they use in the Deploy HQ app. No password — a login link lands in your inbox.</div>
        </div>
      ) : (
        <div id="gate-form" key={"s" + shake} className={shake ? "shake" : ""}>
          <div id="gate-note" style={{ marginBottom: 8 }}>Link sent to <b>{email.trim().toLowerCase()}</b>. Tap it on this device — or paste the code from the email:</div>
          <input id="gate-input" type="text" inputMode="numeric" placeholder="6-digit code" autoComplete="one-time-code"
            value={code} onChange={e => setCode(e.target.value)} onKeyDown={onKey(verifyCode)} />
          <button id="gate-btn" onClick={verifyCode} disabled={busy}>{busy ? "CHECKING…" : "VERIFY →"}</button>
          <div id="gate-error">{error}</div>
          <button id="gate-alt" onClick={() => { setSent(false); setCode(""); setError(""); }}>use a different email</button>
        </div>
      )}
    </GateShell>
  );
}

function DeniedGate({ applicationStatus, error }) {
  const note = error
    ? "Something broke loading the portal: " + error
    : applicationStatus === "pending"
      ? "You're signed in, and your application is pending review. You'll get access once it's approved."
      : applicationStatus === "rejected"
        ? "You're signed in, but this email doesn't have member access."
        : "You're signed in, but this email isn't on the member list. If you joined under a different address, sign out and use the one from the Deploy events.";
  return (
    <GateShell>
      <div id="gate-form">
        <div id="gate-error">{error ? "// LOAD ERROR" : "// NOT ON THE LIST"}</div>
        <div id="gate-note">{note}</div>
        <button id="gate-btn" onClick={signOut} style={{ marginTop: 10 }}>SIGN OUT</button>
      </div>
    </GateShell>
  );
}

function BootGate() {
  return (
    <GateShell>
      <div id="gate-note">// LOADING…</div>
    </GateShell>
  );
}

/* ── root: boot state machine ── */
function Root() {
  const [phase, setPhase] = useState("boot"); // boot | login | denied | ready
  const [gateErr, setGateErr] = useState(null);
  const [denied, setDenied] = useState({});

  useEffect(() => {
    (async () => {
      localStorage.removeItem("deploytlv_members_unlocked"); // old password gate
      // Local dev hook: inject window.__DEV_DATA__ (e.g. from the gitignored
      // data files) to render the portal without Supabase. Localhost only.
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.__DEV_DATA__) {
        OWNER = !!window.__DEV_DATA__.owner;
        applyDocs(window.__DEV_DATA__, window.__DEV_DATA__.liveProfiles);
        setPhase("ready");
        return;
      }
      const authErr = await completeSignInFromUrl();
      if (authErr) { setGateErr(authErr.toUpperCase()); setPhase("login"); return; }
      const { data } = await sb.auth.getSession();
      if (!data.session) { setPhase("login"); return; }
      const res = await loadPortal();
      if (res.ok) setPhase("ready");
      else { setDenied(res); setPhase("denied"); }
    })();
  }, []);

  if (phase === "boot") return <BootGate />;
  if (phase === "login") return <LoginGate initialError={gateErr} />;
  if (phase === "denied") return <DeniedGate applicationStatus={denied.applicationStatus} error={denied.error} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
