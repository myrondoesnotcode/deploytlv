# Tzippy — WhatsApp chat analyzer

Live: **https://deploytlv.com/tzippy/** · Friends front door: **https://deploytlv.com/tzippy/?for=friends**

Drop a WhatsApp export in, get an interactive report in the browser. **Nothing is
uploaded** — parsing, stats, and rendering all run client-side. A Deploy TLV
community tool / lead magnet.

> This is the **canonical source**. It supersedes the old `whatsapp` repo
> (`myrondoesnotcode.github.io/whatsapp`), which now just redirects here.

---

## Architecture

- **One self-contained file:** [`index.html`](index.html). Inline CSS + JS, no
  build step, no dependencies, no network calls. Edit it directly.
- **Hosting:** GitHub Pages serves the `deploytlv` repo from `main`/root (no
  Jekyll config). **Pushing to `main` auto-deploys** to deploytlv.com. Files here
  serve at `deploytlv.com/tzippy/…`. CDN caching means a new build can take 1–3
  min and a hard-refresh (or `?cb=…`) may be needed to bypass a cached copy.
- **Also exists (separate, parallel):** a local Python CLI version of the same
  analyzer lives in the `WhatsApp Analysis` project (`analyzer/`, `run.py`). It is
  NOT this file — changes don't cross over automatically.

## Two audiences (the landing)

Builders is the **default front door**; friends is one click (or a URL) away.

- **Switcher** in the hero: `🚀 For builders & teams` / `💬 For friend groups`.
  Driven by `setAudience(mode, updateUrl)` + the `LANDING` object (hero copy,
  preview mock, feature framing, which demo the CTA runs).
- **Routing:** `?for=friends` (or `#friends`) opens the friends front door on
  load. `setAudience` writes the param back with `history.replaceState`.
- **Friends unfurl page:** [`friends/index.html`](friends/index.html) — a tiny
  redirect to `../?for=friends` carrying **friends-specific og/twitter tags** so
  the link previews friends-first. (Currently reuses the 1200×630 `og.png`; a
  bespoke Wrapped image is a listed TODO.)

## The report (lens system)

The mechanical core (parsing, timing, who-replies-to-whom, vocabulary) is shared;
only the interpretive layer swaps. See the `LENSES` object (`business` | `social`).

- **Auto-detect:** `detectLens(chat, links, tools)` scores tool/tech mentions,
  how technical the links are, and group size → picks a lens and a reason string,
  shown in the report's overview banner. Overridable with the in-report
  **Builder/Friends toggle** (`switchLens`), which re-renders the parsed chat
  without re-reading the file.
- **Social dynamics:** `socialInsights(chat, questions)` computes the friends-lens
  analytics (reciprocity, one-sided chasing, revivers, night owls, monologuers,
  gets-love, unanswered-by-asker). Builder lens keeps tools/signals/repos.

## Share system (the viral surface)

Opened via the **Share** button → modal with **three modes**:

| Mode | What it is |
|------|-----------|
| **✨ Wrapped** | Superlatives card — the tag-bait. Forces square/story format. |
| **Group card** | Aggregate stats; names optional (off = safe to post publicly). |
| **My card** | One member's own stats. |

- Cards render to `<canvas>` (`drawShareImage` → `groupWide/Square`,
  `personWide/Square`, `imgAwardGrid`). Wide = 1200×630 (link preview), square =
  1080×1080 (WhatsApp/IG).
- **Auto-branding:** `siteLabel()` stamps `location.host + path` on every card →
  currently `deploytlv.com/tzippy`. Move the host, the branding follows.
- **Shareable link:** a card packs into a `#card=…` URL fragment (deflate →
  base64url, `packCard`/`unpackCard`) — nothing uploaded; the shared page shows
  an "Analyze your own chat →" CTA.
- **Outbound:** WhatsApp / native-share buttons pre-fill `shareText()`.

### Wrapped — how it's built

- `computeAwards(D)` is **lens-aware**. Social set: 🎭 Main Character · 🦉 Night
  Owl · 🥰 Most Loved · 🔥 Chat Reviver · 🗣️ Monologue Master · 👻 Left on Read ·
  🎬 Conversation Starter · 📸 Paparazzi (pulled from `D.social` + people stats).
  Builder set = the original `AWARD_DEFS`.
- `setShareMode("wrapped")` builds a group card with `{names:true, wrapped:true}`,
  forces square format, and sets the modal title.
- `card.wrapped` drives the canvas eyebrow (`YOUR GROUP CHAT, WRAPPED ✨`) and the
  "THE SUPERLATIVES ✨" heading in `groupSquare`. The card shows the **top 4**
  superlatives (`imgAwardGrid` max).
- `shareText()` writes a Wrapped-specific caption.

### Wrapped — ideas / next session (TODO)

- **Bespoke unfurl image** for `/friends/` (and maybe a `/wrapped` route): generate
  a Wrapped card PNG **from the live site** (so `siteLabel` stamps deploytlv.com)
  and commit it as the og image.
- **Dedicated Wrapped canvas layout** instead of reusing `groupSquare` — bigger
  superlatives, less stat-grid, more "story" feel; consider a 1080×1920 IG-story size.
- **Show all superlatives** (currently 4) — rotate, or a taller layout.
- **More social superlatives:** Class Clown (most laughter *sent* — needs a
  per-person metric), Fastest/Slowest Replier, Emoji Lord, Early Bird.
- **Per-person "My Wrapped"** and a **year-in-review / seasonal campaign** framing.
- **Animated reveal** version as a scrollable web page, not just a static card.

## Funnel / lead-magnet status

**Built (viral machinery):** tool on the Deploy domain, auto-branded share cards,
shareable `#card=` links with a loop-back CTA, the Wrapped tag-bait, and a friends
unfurl page. Every shared card carries `deploytlv.com/tzippy`.

**Built (community bridge):** an ungated **"Join Deploy TLV" CTA** at the end of
every report (`communityCTA()`) — lens-aware: a real "Apply to join →" for the
builder audience, a lighter brand nod for friends. Links to the Fillout
application, utm-tagged `utm_source=tzippy&utm_campaign={builders|friends}` for
attribution, plus `@DeployTLV` on Instagram.

**Built (cross-pollination):**
- The deploytlv.com homepage footer links to `/tzippy/` ("Group Chat Analyzer").
- The shared `#card=` landing page footer (`sharedFoot()`) carries a "Made with
  Tzippy by **Deploy TLV**" link → deploytlv.com — so viral *recipients* (not just
  people who ran the tool) get a brand touch + path to the community.

The funnel loop is now closed end-to-end: viral share → deploytlv.com/tzippy →
run chat → in-report "Join Deploy TLV" CTA → application. **Nothing left open on
the funnel itself** (future work is amplification: the bespoke Wrapped unfurl
image, a launch push, campaigns).

Community application form: `https://forms.fillout.com/t/gQiowrhyNAus`.
Instagram: `@DeployTLV`.

## Notes

- Carries a **Cloudflare Web Analytics** snippet with a placeholder
  `CF_BEACON_TOKEN` (inert until a real token is set).
- Not affiliated with WhatsApp/Meta. Reads export files the user produces.
