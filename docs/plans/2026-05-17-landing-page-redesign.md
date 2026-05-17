# Landing Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current minimal home page with a full DeployTLV org landing page — hero, manifesto copy, Luma CTA, then events grid.

**Architecture:** Single static HTML file (`index.html`) overwrite. No JS required. Same Google Fonts + brand tokens as existing codebase. Header and events grid CSS carry over; new sections are hero, manifesto, and CTA.

**Tech Stack:** Vanilla HTML/CSS, IBM Plex Mono + Barlow Condensed via Google Fonts, GitHub Pages

---

### Task 1: Overwrite `index.html` with the new landing page

**Files:**
- Modify: `index.html`

**Step 1: Replace the entire file**

Replace the full contents of `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeployTLV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Barlow+Condensed:wght@800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0A0A0A;
      color: #EFEFEF;
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 40px;
      border-bottom: 1px solid #1A1A1A;
    }
    .logo { display: flex; align-items: center; gap: 14px; }
    .logo-circle {
      width: 44px; height: 44px;
      border: 2.5px solid #F5E642;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .logo-circle span {
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-weight: 900; font-size: 16px;
      color: #F5E642; letter-spacing: -1px;
    }
    .logo-text {
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-weight: 900; font-size: 22px; letter-spacing: 3px;
      text-transform: uppercase; color: #EFEFEF;
    }
    .logo-text span { color: #F5E642; }
    .header-label {
      font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
      color: #555;
    }

    /* ── Hero ── */
    .hero {
      padding: 80px 40px 60px;
      max-width: 900px;
    }
    .hero-eyebrow {
      font-size: 11px; letter-spacing: 5px; text-transform: uppercase;
      color: #555; margin-bottom: 20px;
    }
    .hero h1 {
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-weight: 900;
      font-size: clamp(64px, 11vw, 130px);
      line-height: 0.9;
      text-transform: uppercase;
      color: #EFEFEF;
      letter-spacing: -1px;
    }
    .hero h1 .yellow { color: #F5E642; }
    .hero-sub {
      margin-top: 28px;
      font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
      color: #555;
      border-top: 1px solid #1A1A1A;
      padding-top: 20px;
    }

    /* ── Manifesto ── */
    .manifesto {
      padding: 0 40px 60px;
      max-width: 700px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .manifesto-block {
      border-left: 2px solid #F5E642;
      padding: 20px 0 20px 28px;
      border-bottom: 1px solid #1A1A1A;
    }
    .manifesto-block:last-child {
      border-bottom: none;
    }
    .manifesto-block p {
      font-size: 14px;
      line-height: 1.8;
      color: #AFAFAF;
    }
    .manifesto-block p strong {
      color: #EFEFEF;
      font-weight: 700;
    }

    /* ── CTA ── */
    .cta-section {
      padding: 40px 40px 80px;
    }
    .cta-btn {
      display: inline-block;
      background: #F5E642;
      color: #0A0A0A;
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-weight: 900;
      font-size: 22px;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-decoration: none;
      padding: 20px 40px;
      transition: opacity 0.15s, transform 0.15s;
    }
    .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .cta-caption {
      margin-top: 14px;
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #444;
    }

    /* ── Events ── */
    .events-section {
      padding: 0 40px 80px;
      flex: 1;
      border-top: 1px solid #1A1A1A;
    }
    .events-label {
      font-size: 10px; letter-spacing: 5px; text-transform: uppercase;
      color: #555; margin: 40px 0 24px;
    }
    .events-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .event-card {
      width: 280px;
      border: 1px solid #333;
      padding: 28px 24px;
      display: flex; flex-direction: column; gap: 12px;
      text-decoration: none;
      transition: border-color 0.2s, transform 0.15s;
    }
    .event-card.active { border-color: #F5E642; cursor: pointer; }
    .event-card.active:hover { transform: translateY(-2px); border-color: #fff; }
    .event-card.locked { border-color: #1E1E1E; cursor: default; opacity: 0.5; }
    .card-number {
      font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #555;
    }
    .event-card.active .card-number { color: #F5E642; }
    .card-title {
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-weight: 900; font-size: 32px; letter-spacing: 1px;
      text-transform: uppercase; color: #EFEFEF; line-height: 1;
    }
    .card-meta {
      font-size: 11px; letter-spacing: 2px; color: #555; text-transform: uppercase;
    }
    .event-card.active .card-meta { color: #888; }
    .card-divider { border: none; border-top: 1px solid #1A1A1A; margin: 4px 0; }
    .event-card.active .card-divider { border-color: #2A2A2A; }
    .card-cta {
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-weight: 900; font-size: 14px; letter-spacing: 3px;
      text-transform: uppercase; color: #F5E642;
    }
    .card-lock {
      font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #333;
    }
  </style>
</head>
<body>

  <header>
    <div class="logo">
      <div class="logo-circle"><span>DE</span></div>
      <div class="logo-text">Deploy<span>TLV</span></div>
    </div>
    <div class="header-label">Builders Only.</div>
  </header>

  <section class="hero">
    <div class="hero-eyebrow">// deploytlv.com</div>
    <h1>THE ROOM<br>WHERE TLV<br><span class="yellow">BUILDS.</span></h1>
    <div class="hero-sub">Real builders. Real projects. No panels.</div>
  </section>

  <section class="manifesto">
    <div class="manifesto-block">
      <p><strong>Most rooms are full of people talking about building.</strong><br>This one is full of people doing it.</p>
    </div>
    <div class="manifesto-block">
      <p>Deploy TLV is a recurring gathering for founders, engineers, and makers shipping real things with AI — startups, side projects, agents, tools, experiments that became companies. Small groups. Vetted. Structured to spark the conversations worth having.</p>
    </div>
    <div class="manifesto-block">
      <p><strong>Tel Aviv has some of the best builders in the world.</strong><br>We're putting them in the same room.</p>
    </div>
  </section>

  <section class="cta-section">
    <a class="cta-btn" href="https://luma.com/bf01yb5r" target="_blank" rel="noopener">
      Request to Join Deploy #1 &nbsp;→
    </a>
    <div class="cta-caption">~20 people &nbsp;·&nbsp; Tel Aviv &nbsp;·&nbsp; Approval required &nbsp;·&nbsp; Spots limited</div>
  </section>

  <section class="events-section">
    <div class="events-label">// Events</div>
    <div class="events-grid">

      <a class="event-card active" href="events/1/">
        <div class="card-number">Event #01</div>
        <div class="card-title">Deploy<br>TLV</div>
        <div class="card-meta">May 18 &nbsp;·&nbsp; TLV</div>
        <hr class="card-divider" />
        <div class="card-cta">Enter →</div>
      </a>

      <div class="event-card locked">
        <div class="card-number">Event #02</div>
        <div class="card-title">Deploy<br>TLV</div>
        <div class="card-meta">Coming soon</div>
        <hr class="card-divider" />
        <div class="card-lock">⌛ Locked</div>
      </div>

      <div class="event-card locked">
        <div class="card-number">Event #03</div>
        <div class="card-title">Deploy<br>TLV</div>
        <div class="card-meta">Coming soon</div>
        <hr class="card-divider" />
        <div class="card-lock">⌛ Locked</div>
      </div>

    </div>
  </section>

</body>
</html>
```

**Step 2: Verify in browser**

Open `index.html` and check:
- [ ] Hero: `THE ROOM / WHERE TLV / BUILDS.` renders large, "BUILDS." in yellow
- [ ] Subline: `Real builders. Real projects. No panels.` in muted mono
- [ ] 3 manifesto blocks with yellow left-border accents visible
- [ ] Yellow `REQUEST TO JOIN DEPLOY #1 →` button present
- [ ] Button links to `https://luma.com/bf01yb5r` (opens in new tab)
- [ ] Caption below button: `~20 people · Tel Aviv · Approval required · Spots limited`
- [ ] Events section with Event #01 (yellow border, links to `events/1/`) + #02/#03 grayed
- [ ] No JS errors in console

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: redesign landing page with org copy and Luma CTA"
```

---

### Task 2: Push and verify on deploytlv.com

**Step 1: Push to GitHub**

```bash
git push
```

**Step 2: Wait for Pages to rebuild (~60s), then check**

```bash
gh api repos/myrondoesnotcode/deploytlv/pages --jq '.status'
```

Expected: `"built"`

**Step 3: Visit deploytlv.com**

- [ ] Home page loads with new design
- [ ] Luma CTA button works
- [ ] Event #01 card → password gate → attendee app
