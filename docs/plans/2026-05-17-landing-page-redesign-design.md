# Landing Page Redesign — Design Doc

**Date:** 2026-05-17
**Goal:** Replace the current minimal home page with a full org landing page that tells the DeployTLV story, drives signups for Event #1 via Luma, and lists the events grid below.

---

## Problem

The current `index.html` goes straight into "WHO'S IN THE ROOM?" with an event-selection prompt. A first-time visitor has no context for what DeployTLV is, why they should care, or what to do. The page feels like a nav screen rather than a community home page.

---

## Architecture

Single static HTML file (`index.html`). Vanilla HTML/CSS only — no JS needed. Same tech stack as today: IBM Plex Mono + Barlow Condensed via Google Fonts, brand tokens (`#F5E642` yellow, `#0A0A0A` black, `#1A1A1A` dark gray).

---

## Page Structure (top to bottom)

### 1. Header (unchanged)
- Left: DE circle logo + "DEPLOYTLV"
- Right: "Builders Only."

### 2. Hero
- Eyebrow: `// deploytlv.com`
- Headline (Barlow Condensed 900, massive):
  ```
  THE ROOM
  WHERE TLV
  BUILDS.
  ```
- Subline (IBM Plex Mono, small caps): `Real builders. Real projects. No panels.`

### 3. Manifesto — 3 blocks
Separated by subtle yellow left-border accent lines (2px `#F5E642` left border, padded).

**Block 1** (bold statement):
> Most rooms are full of people talking about building.
> This one is full of people doing it.

**Block 2** (what it is):
> Deploy TLV is a recurring gathering for founders, engineers, and makers shipping real things with AI — startups, side projects, agents, tools, experiments that became companies. Small groups. Vetted. Structured to spark the conversations worth having.

**Block 3** (closer):
> Tel Aviv has some of the best builders in the world.
> We're putting them in the same room.

### 4. CTA Block
- Full-width yellow button → `https://luma.com/bf01yb5r`
- Button text: `REQUEST TO JOIN DEPLOY #1  →`
- Caption below (muted, small caps): `~20 people · Tel Aviv · Approval required · Spots limited`

### 5. Events Grid (unchanged)
- Section label: `// Events`
- Event #01 card: active, yellow border, links to `events/1/`
- Event #02, #03 cards: locked, grayed out

---

## Brand Tokens (carry over from existing)
- Yellow: `#F5E642`
- Black: `#0A0A0A`
- Dark gray: `#1A1A1A`
- Body: IBM Plex Mono
- Headlines: Barlow Condensed 900

---

## Luma URL
`https://luma.com/bf01yb5r` — Event #1 registration (Deploy #1 by Deploy TLV, Tel Aviv, ~20 people, approval required)

---

## Verification
- Open `index.html` in browser
- Confirm hero headline renders large, BUILDS. in yellow
- Confirm 3 manifesto blocks visible with yellow left accents
- Confirm CTA button links to Luma URL and opens correctly
- Confirm events grid below with Event #01 active
- Check mobile layout (cards wrap gracefully)
