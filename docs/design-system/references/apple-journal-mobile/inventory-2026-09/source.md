# Apple Journal entry inventory

Reference: REF-2026-09-28-apple-journal-inventory. Received September 28, 2026, user-supplied iPhone screenshot; exact app version and capture date unknown. [Original](original.png) is private research material containing family photos and journal text; do not publish or reuse its pixels in product assets.

Owner preference: full-width entries, associated imagery grouped as a grid, places represented with maps. Mode: reference capture and proposed scoped trial, not implementation or adoption.

Observed: one-column rounded entry cards. The visible entry combines a varied-size image/map/activity arrangement, bold title, readable excerpt and subdued date/footer. A later entry has a different media arrangement. Month labels group entries. No inference about automatic selection, title generation, media ordering or ingestion permissions follows from the still image.

Preserve: one entry as one coherent object; readable text width; supporting media contained within the entry; quiet date hierarchy.
Translate: current white Biographer inventory, rounded cards and app header; full-width entries with optional bounded media area, existing text excerpt and truthful date/period. Keep accepted continuous scrubber and floating conversation action. No mandatory title where none exists. Text-only entries collapse the media area entirely.
Reject: copying private imagery, Apple navigation/branding, empty media placeholders, implying that map/location ingestion exists, or inventing exact dates for approximate memories.

Candidate trial: returning user recognizing and reopening entries. Replace two-column cards with full-width cards. Show text-only, single photo, multiple photos, and photos plus an explicitly illustrative place map. A map treatment is a design proposal, not a working location data pipeline. Preserve the quiet writing canvas as excluded context. Existing entry model owns words and date; photo association owns attached assets; place provenance/ingestion remains unresolved. Trial should use owned or fictional material, not these family photos.

Tradeoff: fewer entries visible per screen, with more readable excerpts and richer recognition cues. Proposed next decision: trial this card structure while retaining existing header, scrollbar and conversation action. No native changes in this capture turn.

## Authorized native trial
Andrew selected the four-variant trial. Implemented behind explicit Debug --entry-card-trial alongside --timeline-demo in the standalone native Biographer folder. Current default inventory is unchanged. iOS simulator build and render reviewed: full-width-cards.png (text/single-photo), full-width-media.png (collage/illustrative map), both under /Users/andrewwatanabe/kwilt-biographer/evidence/timeline-scrubber/. Entry canvas excluded and unchanged. Stock photos and fictional stories; map illustration is not place ingestion. Evidence and photo credits in that folder's verification.md. Pending owner refinement/adoption; no Canonical promotion or TestFlight delivery.

## Owner refinement
Andrew likes the full-width treatment and explicitly retains the outer card rounding. Tightened media-internal corners while preserving the rounded overall collage silhouette: current native trial uses 28pt card / 20pt collage perimeter / 4pt inner corners. Removed all demo/stock/sample labels from the inventory per explicit direction; provenance stays in evidence documentation. Installed simulator screenshot: refined-media-corners.png. These are local trial values, not global token promotion.

Further owner refinement: inner 4pt corners felt too tight; trial increased to 7pt, retaining 20pt collage perimeter and 28pt card. Current rendered evidence: media-corners-7pt.png. No broader token change.

Owner selected 8pt internal media corners, preferring multiples of four. Current local radius family: inner media 8pt, collage perimeter 20pt, outer card 28pt. Supersedes 7pt; no unrelated spacing changes. Simulator evidence: media-corners-8pt.png.
