/* Deploy #2 — Attendee Intelligence portal (brand-light theme) */
const { useState } = React;

/* ── theme tokens ── */
const BG = "#F4EDD7", BG_OFF = "#EBE3C8", CARD = "#FBF7E8";
const INK = "#111111", MUTED = "#6B6557", FAINT = "#A49B7E";
const BORDER = "#DDD3B0", ACCENT = "#F5D400", GOLD = "#8A6D00", BLACK = "#0A0A0A";
const MONO = "'IBM Plex Mono','Courier New',monospace";
const BARLOW = "'Barlow Condensed',Impact,sans-serif";

/* ── data assembly ── */
const ATTENDEES = (window.D2.newAttendees || []).concat(window.D2.alumni || []);
const MATCHES = window.D2.matches || [];
const TAG_COLORS = window.D2.tagColors || {};
const CLUSTERS = (window.D2.clusterDefs || []).map(d => ({
  ...d,
  members: ATTENDEES.filter(a => (a.cluster || []).includes(d.name)).map(a => a.name)
})).filter(c => c.members.length > 0);

const BREAKOUTS = window.D2.breakoutGroups || [];

const byName = name => ATTENDEES.find(a => a.name === name);
const byId = id => ATTENDEES.find(a => a.id === id);

/* ── helpers ── */
function revLabel(rev) {
  return (rev === "Revenue" || (rev && rev.startsWith("$"))) ? "Revenue" : "Pre-Revenue";
}
function revStyle(rev) {
  return revLabel(rev) === "Revenue" ? { background: ACCENT, color: BLACK } : { background: "#EADFBC", color: "#8C8163" };
}

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
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center top"
          }} />
      )}
    </div>
  );
}

function Label({ children, mt }) {
  return (
    <div className="barlow" style={{
      display: "flex", alignItems: "center", gap: 7,
      fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: 3,
      textTransform: "uppercase", marginBottom: 8, marginTop: mt || 18
    }}>
      <span style={{ width: 8, height: 8, background: ACCENT, display: "inline-block" }} />
      {children}
    </div>
  );
}

function Badge({ text, bg, color, border }) {
  return (
    <span className="barlow" style={{
      background: bg || "transparent", color: color || INK,
      border: border ? "1px solid " + border : "none",
      fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
      padding: "2px 7px", textTransform: "uppercase", whiteSpace: "nowrap"
    }}>{text}</span>
  );
}

function StackChips({ stack, max }) {
  const shown = max ? stack.slice(0, max) : stack;
  const extra = max && stack.length > max ? stack.length - max : 0;
  return (
    <div>
      {shown.map(t => (
        <span key={t} style={{
          display: "inline-block", background: "#fff", border: "1px solid " + BORDER,
          color: MUTED, fontSize: 10, padding: "2px 7px", marginRight: 4, marginTop: 4
        }}>{t}</span>
      ))}
      {extra > 0 && (
        <span style={{
          display: "inline-block", background: "#fff", border: "1px solid " + BORDER,
          color: FAINT, fontSize: 10, padding: "2px 7px", marginTop: 4
        }}>+{extra}</span>
      )}
    </div>
  );
}

/* ── App ── */
function App() {
  const [tab, setTab] = useState("profiles");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [clusterFilter, setClusterFilter] = useState(null);
  const [myName, setMyName] = useState("");
  const [myId, setMyId] = useState(null);

  const filtered = ATTENDEES.filter(a => {
    const q = search.toLowerCase();
    const ms = !q || a.name.toLowerCase().includes(q) ||
      (a.project || "").toLowerCase().includes(q) ||
      (a.tagline || "").toLowerCase().includes(q);
    const mc = !clusterFilter || (a.cluster || []).includes(clusterFilter);
    return ms && mc;
  });

  const tabs = [["profiles", "Profiles"], ["matches", "Matchmaking"], ["clusters", "Skill Map"], ["breakouts", "Breakout"], ["forme", "Who To Meet"]];

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: MONO, color: INK }}>

      {/* HEADER */}
      <div style={{
        background: BG, borderBottom: "1px solid " + BORDER,
        padding: "16px 22px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
        flexWrap: "wrap", gap: 10
      }}>
        <div className="barlow" style={{ display: "flex", alignItems: "flex-end", fontWeight: 900, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>
          <span>Deploy&nbsp;TLV</span>
          <span style={{ color: ACCENT, fontSize: 28, lineHeight: 0.7 }}>_</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge text="Deploy #02" bg={ACCENT} color={BLACK} />
          <span style={{ color: MUTED, fontSize: 11, letterSpacing: 1 }}>{ATTENDEES.length} ATTENDEES · JUNE 2026 · TLV</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", padding: "0 14px", borderBottom: "1px solid " + BORDER, overflowX: "auto", background: BG }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="barlow" style={{
            background: "none", border: "none",
            color: tab === k ? INK : FAINT,
            fontSize: 13, fontWeight: 800, letterSpacing: 2, padding: "13px 16px",
            cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap",
            borderBottom: tab === k ? "2px solid " + ACCENT : "2px solid transparent", outline: "none"
          }}>{label}</button>
        ))}
      </div>

      {/* PROFILES */}
      {tab === "profiles" && (
        <React.Fragment>
          <div style={{ padding: "14px 16px 8px", borderBottom: "1px solid " + BORDER }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH BY NAME, PROJECT, OR KEYWORD..."
              style={{
                background: "#fff", border: "1px solid " + BORDER, color: INK,
                padding: "11px 14px", fontSize: 12, width: "100%", outline: "none",
                fontFamily: "inherit", letterSpacing: 1
              }} />
          </div>
          <div style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid " + BORDER }}>
            <button onClick={() => setClusterFilter(null)} className="barlow" style={{
              background: !clusterFilter ? ACCENT : "#fff",
              border: "1px solid " + (!clusterFilter ? ACCENT : BORDER),
              color: !clusterFilter ? BLACK : MUTED,
              fontSize: 11, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
              letterSpacing: 1, whiteSpace: "nowrap", textTransform: "uppercase"
            }}>All ({ATTENDEES.length})</button>
            {CLUSTERS.map(c => {
              const on = clusterFilter === c.name;
              return (
                <button key={c.name} onClick={() => setClusterFilter(on ? null : c.name)} className="barlow" style={{
                  background: on ? c.color : "#fff",
                  border: "1px solid " + (on ? c.color : BORDER),
                  color: on ? "#fff" : MUTED,
                  fontSize: 11, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
                  letterSpacing: 1, whiteSpace: "nowrap", textTransform: "uppercase"
                }}>{c.name} ({c.members.length})</button>
              );
            })}
          </div>
          <div style={{ padding: "8px 16px 0", color: MUTED, fontSize: 11 }}>{filtered.length} attendees shown</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12, padding: 16 }}>
            {filtered.map(a => (
              <div key={a.id} className="d2-card" style={{ padding: 16 }} onClick={() => setSelected(a)}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                  <Avatar a={a} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ color: FAINT, fontSize: 11, fontWeight: 700 }}>#{String(a.id).padStart(2, "0")}</span>
                      <Badge text={revLabel(a.revenue)} bg={revStyle(a.revenue).background} color={revStyle(a.revenue).color} />
                    </div>
                    <div className="barlow" style={{ fontSize: 19, fontWeight: 900, letterSpacing: 0, lineHeight: 1.05 }}>{a.name}</div>
                    <div className="barlow" style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{a.project}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>                  {a.d1 && <Badge text="↩ Deploy #1" border={BORDER} color={MUTED} />}
                </div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 6 }}>{a.tagline}</div>
                <StackChips stack={a.stack} max={3} />
              </div>
            ))}
          </div>
        </React.Fragment>
      )}

      {/* MATCHMAKING */}
      {tab === "matches" && (
        <div style={{ padding: 16, maxWidth: 720 }}>
          <div style={{ marginBottom: 18 }}>
            <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>Top {MATCHES.length} Introductions</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>RANKED BY SIGNAL STRENGTH · D#1 = RETURNING DEPLOY #1 ALUM</div>
          </div>
          {MATCHES.map(m => (
            <div key={m.rank} className="d2-flat" style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="barlow" style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>#{m.rank}</span>
                <Badge text={m.tag} bg={TAG_COLORS[m.tag] || "#888"} color="#fff" />
              </div>
              <div className="barlow" style={{ fontSize: 19, fontWeight: 900, marginBottom: 8, lineHeight: 1.1 }}>
                <span style={{ cursor: "pointer", borderBottom: "2px solid " + BORDER }} onClick={() => { const o = byName(m.a); if (o) setSelected(o); }}>{m.a}</span>
                {" "}<span style={{ color: GOLD }}>↔</span>{" "}
                <span style={{ cursor: "pointer", borderBottom: "2px solid " + BORDER }} onClick={() => { const o = byName(m.b); if (o) setSelected(o); }}>{m.b}</span>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{m.why}</div>
            </div>
          ))}
        </div>
      )}

      {/* SKILL MAP */}
      {tab === "clusters" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 18 }}>
            <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>Skill &amp; Domain Clusters</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>CLICK A CLUSTER TO FILTER THE PROFILES VIEW</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            {CLUSTERS.map(c => (
              <div key={c.name} className="d2-card" style={{ padding: 16, borderLeft: "3px solid " + c.color }}
                onClick={() => { setClusterFilter(c.name); setTab("profiles"); }}>
                <div className="barlow" style={{ fontSize: 13, fontWeight: 800, color: c.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
                  {c.name} <span style={{ color: FAINT }}>({c.members.length})</span>
                </div>
                {c.members.map(m => {
                  const a = byName(m);
                  return (
                    <div key={m} style={{ fontSize: 12.5, color: MUTED, marginBottom: 4, display: "flex", gap: 6 }}>
                      <span style={{ color: c.color }}>·</span>
                      <span>{m}{a && a.d1 ? <span style={{ color: FAINT, fontSize: 10 }}> · D#1</span> : null}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WHO TO MEET */}
      {tab === "breakouts" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 18 }}>
            <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>Breakout Groups</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>NINE SUGGESTED SESSIONS · CLICK A NAME TO VIEW PROFILE · D#1 = RETURNING ALUM</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 12 }}>
            {BREAKOUTS.map(g => (
              <div key={g.id} className="d2-flat" style={{ padding: 16, borderTop: "3px solid " + (g.color || ACCENT) }}>
                <div className="barlow" style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: 2, marginBottom: 2 }}>GROUP {g.id} · {g.members.length} PEOPLE</div>
                <div className="barlow" style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.05, marginBottom: 6 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55, marginBottom: 10 }}>{g.focus}</div>
                <div style={{ fontSize: 11, marginBottom: 10 }}><span className="barlow" style={{ color: GOLD, fontWeight: 800, letterSpacing: 1 }}>ANCHOR </span><span style={{ color: INK }}>{g.anchor}</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {g.members.map(m => {
                    const a = byName(m);
                    return (
                      <span key={m} onClick={() => a && setSelected(a)} className="barlow" style={{
                        background: "#fff", border: "1px solid " + BORDER, color: INK,
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", letterSpacing: 0.5,
                        cursor: a ? "pointer" : "default", whiteSpace: "nowrap"
                      }}>{m}{a && a.d1 ? " ·D#1" : ""}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "forme" && <ForMe myName={myName} setMyName={setMyName} myId={myId} setMyId={setMyId} setSelected={setSelected} />}

      {/* MODAL */}
      {selected && <Modal a={selected} setSelected={setSelected} />}
    </div>
  );
}

/* ── WHO TO MEET tab ── */
function ForMe({ myName, setMyName, myId, setMyId, setSelected }) {
  const q = myName.trim().toLowerCase();
  // Resolve identity by unique id once a person is explicitly picked. Before that,
  // only auto-resolve when the typed text is an EXACT, unique full-name match —
  // otherwise show a candidate list so people who share a name can pick the right one.
  const exact = q ? ATTENDEES.filter(a => a.name.toLowerCase() === q) : [];
  const me = myId != null ? byId(myId) : (exact.length === 1 ? exact[0] : null);
  const candidates = !me && q ? ATTENDEES.filter(a => a.name.toLowerCase().includes(q)) : [];
  const pickMe = a => { setMyId(a.id); setMyName(a.name); };
  const onType = v => { setMyName(v); if (myId != null) setMyId(null); };
  const myMatches = me ? MATCHES.filter(m => m.a === me.name || m.b === me.name) : [];
  const myClusters = me ? (me.cluster || []) : [];
  const peers = me ? ATTENDEES.filter(a => a.id !== me.id && (a.cluster || []).some(c => myClusters.includes(c)))
    .map(a => ({ ...a, shared: a.cluster.filter(c => myClusters.includes(c)) }))
    .sort((x, y) => y.shared.length - x.shared.length) : [];

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="barlow" style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 }}>Who Should I Meet?</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 1 }}>TYPE YOUR NAME TO GET YOUR PERSONAL MATCH LIST</div>
      </div>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input value={myName} onChange={e => onType(e.target.value)} placeholder="TYPE YOUR NAME..." autoFocus
          style={{ background: "#fff", border: "2px solid " + (me ? ACCENT : BORDER), color: INK, padding: "13px 16px", fontSize: 14, width: "100%", outline: "none", fontFamily: "inherit", letterSpacing: 1 }} />
        {candidates.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid " + BORDER, zIndex: 10, maxHeight: 220, overflowY: "auto" }}>
            <div className="barlow" style={{ padding: "7px 16px", fontSize: 11, color: GOLD, letterSpacing: 1.5, borderBottom: "1px solid " + BORDER, textTransform: "uppercase" }}>↓ Tap your name{candidates.length > 1 ? " (" + candidates.length + " matches)" : ""}</div>
            {candidates.map(a => (
              <div key={a.id} onClick={() => pickMe(a)} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid " + BORDER, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><span style={{ fontWeight: 700 }}>{a.name}</span><span style={{ color: FAINT, marginLeft: 8, fontSize: 11 }}>{a.project}</span></span>
                <span className="barlow" style={{ color: GOLD, fontSize: 11, letterSpacing: 1, whiteSpace: "nowrap", marginLeft: 12 }}>THIS IS ME →</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {myName.length > 0 && !me && candidates.length === 0 && <div style={{ color: MUTED, fontSize: 13, letterSpacing: 1 }}>NO MATCH FOUND — TRY FIRST OR LAST NAME</div>}

      {me && (
        <React.Fragment>
          <div className="d2-flat" style={{ borderLeft: "3px solid " + ACCENT, padding: "14px 16px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div className="barlow" style={{ fontSize: 22, fontWeight: 900 }}>{me.name}</div>
              <span className="barlow" onClick={() => { setMyId(null); setMyName(""); }}
                style={{ cursor: "pointer", color: GOLD, fontSize: 11, letterSpacing: 1.5, whiteSpace: "nowrap", textTransform: "uppercase", borderBottom: "1px solid " + BORDER }}>NOT YOU? ↻</span>
            </div>
            <div className="barlow" style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{me.project}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {me.cluster.map(c => {
                const cl = CLUSTERS.find(x => x.name === c);
                return <Badge key={c} text={c} border={(cl && cl.color) || BORDER} color={(cl && cl.color) || MUTED} />;
              })}
            </div>
          </div>

          {myMatches.length > 0 && (
            <React.Fragment>
              <Label mt={0}>★ Your Priority Matches ({myMatches.length})</Label>
              {myMatches.map(m => {
                const otherName = m.a === me.name ? m.b : m.a;
                const other = byName(otherName);
                return (
                  <div key={m.rank} className="d2-card" style={{ padding: 16, marginBottom: 10 }} onClick={() => other && setSelected(other)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: FAINT, fontSize: 11 }}>MATCH #{m.rank}</span>
                      <Badge text={m.tag} bg={TAG_COLORS[m.tag] || "#888"} color="#fff" />
                    </div>
                    <div className="barlow" style={{ fontSize: 18, fontWeight: 900 }}>{otherName}</div>
                    {other && <div className="barlow" style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{other.project}</div>}
                    <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{m.why}</div>
                    <div style={{ marginTop: 10, fontSize: 10, color: FAINT, letterSpacing: 1 }}>TAP TO VIEW FULL PROFILE →</div>
                  </div>
                );
              })}
            </React.Fragment>
          )}

          {peers.length > 0 && (
            <React.Fragment>
              <Label mt={myMatches.length > 0 ? 28 : 0}>Others In Your Domain ({peers.length})</Label>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>These attendees share at least one cluster with you — common ground for a conversation.</div>
              {peers.map(a => (
                <div key={a.id} className="d2-card" style={{ padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} onClick={() => setSelected(a)}>
                  <div>
                    <div className="barlow" style={{ fontSize: 16, fontWeight: 900, marginBottom: 2 }}>{a.name}{a.d1 ? <span style={{ color: FAINT, fontSize: 10, fontWeight: 400 }}> · D#1</span> : null}</div>
                    <div className="barlow" style={{ fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{a.project}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {a.shared.map(c => {
                        const cl = CLUSTERS.find(x => x.name === c);
                        return <Badge key={c} text={c} border={(cl && cl.color) || BORDER} color={(cl && cl.color) || MUTED} />;
                      })}
                    </div>
                  </div>
                  <span style={{ marginLeft: 10 }}><Badge text={revLabel(a.revenue)} bg={revStyle(a.revenue).background} color={revStyle(a.revenue).color} /></span>
                </div>
              ))}
            </React.Fragment>
          )}

          {myMatches.length === 0 && peers.length === 0 && <div style={{ color: MUTED, fontSize: 13 }}>No matches found for this profile.</div>}
        </React.Fragment>
      )}
    </div>
  );
}

/* ── profile modal ── */
function Modal({ a, setSelected }) {
  const mm = MATCHES.filter(m => m.a === a.name || m.b === a.name);
  const websiteHref = a.website ? (a.website.startsWith("http") ? a.website : "https://" + a.website) : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,17,8,0.55)", zIndex: 200, overflowY: "auto", padding: 20 }}
      onClick={() => setSelected(null)}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 600, margin: "0 auto", background: "#FFFDF6",
        border: "1px solid #C9BE92", borderTop: "4px solid " + ACCENT, padding: 24
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Avatar a={a} size={72} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: FAINT, fontSize: 11, marginBottom: 4 }}>#{String(a.id).padStart(2, "0")} / {(a.cluster && a.cluster[0]) || "—"}</div>
              <div className="barlow" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>{a.name}</div>
              <div className="barlow" style={{ color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>{a.project}</div>
            </div>
          </div>
          <button onClick={() => setSelected(null)} className="barlow" style={{ background: "none", border: "1px solid " + BORDER, color: MUTED, padding: "6px 12px", cursor: "pointer", fontSize: 12, letterSpacing: 2 }}>✕ CLOSE</button>
        </div>

        <div style={{ fontSize: 13, color: INK, lineHeight: 1.6, marginBottom: 14 }}>{a.tagline}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Badge text={revLabel(a.revenue)} bg={revStyle(a.revenue).background} color={revStyle(a.revenue).color} />          {a.d1 && <Badge text="↩ Deploy #1 alum" border={BORDER} color={MUTED} />}
          {a.linkedin && <a className="d2-link" href={"https://linkedin.com/in/" + a.linkedin} target="_blank" rel="noreferrer" style={{ color: MUTED, fontSize: 11, textDecoration: "none", border: "1px solid " + BORDER, padding: "3px 8px", letterSpacing: 1 }}>LINKEDIN ↗</a>}
          {websiteHref && <a className="d2-link" href={websiteHref} target="_blank" rel="noreferrer" style={{ color: MUTED, fontSize: 11, textDecoration: "none", border: "1px solid " + BORDER, padding: "3px 8px", letterSpacing: 1 }}>{a.website} ↗</a>}
        </div>

        <Label>★ Key Insight</Label>
        <div style={{ background: "#FBF5DC", borderLeft: "3px solid " + ACCENT, padding: "12px 16px", fontSize: 13, lineHeight: 1.7, color: INK }}>{a.insight}</div>

        {a.building && (
          <React.Fragment>
            <Label>What They're Building</Label>
            <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7 }}>{a.building}</div>
          </React.Fragment>
        )}

        <Label>Background</Label>
        <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.7 }}>{a.bg}</div>

        {a.stack && a.stack.length > 0 && (
          <React.Fragment>
            <Label>Stack</Label>
            <StackChips stack={a.stack} />
          </React.Fragment>
        )}

        {a.seeking && a.seeking !== "—" && (
          <React.Fragment>
            <Label>Seeking</Label>
            <span style={{ display: "inline-block", background: "#fff", border: "1px solid " + BORDER, color: MUTED, fontSize: 12, padding: "4px 10px" }}>{a.seeking}</span>
          </React.Fragment>
        )}

        <Label>Clusters</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(a.cluster || []).map(c => {
            const cl = CLUSTERS.find(x => x.name === c);
            return <Badge key={c} text={c} border={(cl && cl.color) || BORDER} color={(cl && cl.color) || MUTED} />;
          })}
        </div>

        {a.collab && a.collab.length > 0 && (
          <React.Fragment>
            <Label>Collaboration Angles</Label>
            {a.collab.map((c, i) => (
              <div key={i} style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginBottom: 7, display: "flex", gap: 8 }}>
                <span style={{ color: ACCENT, fontWeight: 900 }}>→</span><span>{c}</span>
              </div>
            ))}
          </React.Fragment>
        )}

        {mm.length > 0 && (
          <React.Fragment>
            <Label>Matchmaking Signals</Label>
            {mm.map(m => {
              const otherName = m.a === a.name ? m.b : m.a;
              return (
                <div key={m.rank} className="d2-flat" style={{ padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: GOLD, fontSize: 11 }}>#{m.rank}</span>
                    <Badge text={m.tag} bg={TAG_COLORS[m.tag] || "#888"} color="#fff" />
                  </div>
                  <div className="barlow" style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                    <span style={{ cursor: "pointer", borderBottom: "1px solid " + BORDER }} onClick={() => { const o = byName(otherName); if (o) setSelected(o); }}>{otherName}</span>
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
