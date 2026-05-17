# Design: Home Page + Password Gate

## Overview

Add a branded home page that lists events, and a password gate on each event page. Attendees visit the home page, select an event, enter the password given at the event, and unlock the attendee intelligence app.

## File Structure

```
index.html            ← new home page (replaces current root)
events/
  1/
    index.html        ← current app moved here + password gate prepended
docs/
  plans/
    2026-05-17-home-page-password-gate-design.md
```

## Home Page (index.html)

**Visual style:** Matches brand — black background, yellow (#E8D700) accents, bold condensed white caps typography (Barlow Condensed or Impact fallback), monospace for metadata details.

**Layout:**
- Top bar: DE logo (yellow circle, text) top-left · "DEPLOY TLV" label top-right
- Hero: Large bold headline "WHO'S IN THE ROOM?" with "BUILDERS." in yellow
- Event cards row:
  - **Event #1** — black card, yellow border, "DEPLOY TLV #1", "MAY 18 · TLV", yellow "ENTER →" button linking to `/events/1/`
  - **Event #2, #3** — same card shape, grayed out, lock icon, "COMING SOON" label, not clickable

## Password Gate (events/1/index.html)

**Trigger:** Renders as a full-screen overlay before the React app mounts. On load, checks `localStorage` for key `deploytlv_event1_unlocked`. If present, skips gate entirely.

**UI:**
- Full-screen black overlay, centered content
- DE logo + "DEPLOY TLV #1" heading + "BUILDERS ONLY." in yellow
- Password input (monospace font) + yellow "ENTER →" button
- Wrong password: shake CSS animation on input + button, red error text `// INCORRECT. TRY AGAIN.`
- Correct password: `pinsker` (case-insensitive) → sets `localStorage.deploytlv_event1_unlocked = true`, overlay fades out, app renders

## Decisions

- **Two HTML files** (not single-file routing) — keeps files focused, easy to add future events
- **localStorage persistence** — password entered once per device
- **No attempt limits** — wrong password just shows error, can retry immediately
