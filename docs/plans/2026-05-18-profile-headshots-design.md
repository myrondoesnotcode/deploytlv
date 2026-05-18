# Profile Headshots Design

**Date:** 2026-05-18

## What was built
Added real headshot photos to attendee profile cards and detail modals in `events/1/index.html`. 30 of 36 attendees have photos; 6 get an initials fallback.

## Photo storage
Photos are stored in `events/1/photos/` (39 `.jpg` files) and referenced with relative paths. GitHub Pages serves them as static files.

## Data
Each attendee object has a `photo` field: a relative path string (`"photos/FILENAME.jpg"`) or `null`.

**Attendees without photos (null):** Drew Stone (#1), Benjamin Lieber (#6), Moshe Schlussel (#17), Vlad Neyshtadt (#19), Alon Shvartsman (#26), Shoval Seidman (#33)

**Non-obvious filename mappings:**
- Artem Belyakov → `Artem.jpg`
- Josh Klawansky → `Josh_K.jpg`
- Menachem Berrebi → `Mendy_Berrebi.jpg`
- Yonatan Langheim Halaf → `Yonatan_Langheim.jpg`

## Rendering
- `photoAvatar(attendee, size)` helper renders an `<img>` with `objectFit: cover, objectPosition: center top` and an `onError` hide handler, or a dark initials div as fallback
- **Cards:** 52px square avatar, left of card header text (ID, revenue, name, project)
- **Modal:** 72px square avatar, left of modal header text (ID/cluster, name, project)

## Design decisions
- Sharp corners throughout — no border-radius, consistent with existing aesthetic
- Photo border `1px solid #303030` (neutral), not yellow — card hover border is sufficient signal
- Initials fallback: `#1c1c1c` background, `#505050` text — visually similar weight to a dark photo
