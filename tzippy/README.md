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
  build step, no dependencies. Edit it directly. The only network calls are
  Google Fonts and the analytics beacon (below) — the analyzer itself makes
  none.
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

## Analytics

**GoatCounter**, wired in `index.html`. Cookieless, no localStorage, no
cross-site identifiers, IPs hashed and discarded — so **no consent banner is
required** and the "nothing is uploaded" promise is untouched: *no data derived
from the chat file is ever sent.* Not the text, not the names, not even a
message count.

**Status: LIVE** as of 2026-08-24. `GC_CODE = "deploytlv"` →
dashboard at **https://deploytlv.goatcounter.com**. It is set in **two** places,
and they must stay in sync so the whole domain lands in one dashboard with
`/tzippy/` as a path:

| File | Where | What it covers |
|---|---|---|
| `tzippy/index.html` | `var GC_CODE` in the `<head>` analytics block | Tzippy + the full funnel |
| `index.html` (site root) | `var GC_CODE` near `</body>` | The deploytlv.com homepage |

Setting `GC_CODE` back to `""` is the kill switch: no script loads at all and
every `tzTrack()` call becomes a no-op.

**Localhost is never counted** — GoatCounter refuses (`not counting because of:
localhost`), so local dev traffic can't pollute the numbers.

**Privacy mechanics.** `window.goatcounter.path` is pinned to
`location.pathname + location.search`, so the `#card=` fragment (which encodes
report figures) can never reach the server. Browsers don't send fragments
anyway; pinning it makes the guarantee explicit rather than incidental.

**Events.** `tzTrack(name)` fires each name **at most once per page load**, so
counts read as *"share of sessions that reached this step"* — the funnel
question — instead of being inflated by repeat clicks.

| Event | Fires when |
|---|---|
| `land-{builders,friends}` | Which front door the visitor arrived at |
| `audience-switch-{…}` | Hero audience toggle clicked |
| `demo-primary-{lens}` / `demo-secondary-{lens}` | Sample-data buttons |
| `upload-{txt,zip}` | A **real** export was chosen or dropped |
| `analyze-start-{real,demo}` | Parsing began |
| `report-{real,demo}-{lens}` | Report rendered — the activation event |
| `lens-switch-{lens}` | Lens flipped on an open report |
| `reset` | "Start over" — analyzed a second chat |
| `error-file-read` / `error-analyze` | Upload failed — watch this one |
| `share-open` | Share dialog opened |
| `share-card-{group,person,wrapped}` · `share-fmt-{wide,square}` · `share-names-on` | Card choices |
| `share-{whatsapp,native,copy-link,save-image,preview-link}` | An actual share |
| `card-view-{group,person}` | **Inbound:** a shared card link was opened |
| `card-cta` | A card recipient clicked through to try their own chat |

**The two ratios that matter:**

- **Activation** — `report-real-*` ÷ `land-*`. How many visitors get past the
  landing page with a real chat. `demo-*` vs `upload-*` tells you whether the
  sample data is a helpful on-ramp or a substitute for trying it.
- **Virality** — `card-cta` ÷ `card-view-*`, and `card-view-*` ÷
  `share-{whatsapp,copy-link}`. The first is how persuasive a shared card is;
  the second is how many people each sharer actually reaches. Multiply them by
  activation and you have the loop's real coefficient.

**Ad blockers — undercount only, never a broken page.** `gc.zgo.at` is on some
ad-block lists, so expect a 10–30% undercount. Ratios stay meaningful; absolute
numbers are a floor, not a total.

The **site itself is unaffected**. The tracker is a separate `<script>` appended
to `<head>`; if that request is blocked, `window.goatcounter.count` is simply
never defined, `tzTrack()` swallows the event, and the analyzer — which is
inline in this file and makes no network calls — runs untouched. Verified by
simulating a blocked script and driving the full funnel: demo report, lens
switch, share modal, share link, card image, WhatsApp hand-off, and a real
400-message export all worked, with no console errors beyond the blocked
request itself.

## Notes

- Carries a **Cloudflare Web Analytics** snippet with a placeholder
  `CF_BEACON_TOKEN` (inert until a real token is set).
- Not affiliated with WhatsApp/Meta. Reads export files the user produces.
