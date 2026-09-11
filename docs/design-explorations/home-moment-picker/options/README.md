# Share a moment — visual revision 2

Design concepts for review, not changes to the native implementation. Open index.html or serve this directory. Example activity and imagery are illustrative; none claims to be the account's real activity. No action publishes or persists a draft.

## What failed

The initial implementation combined selection, audience configuration, draft management and publishing before there was anything to share. Source labels looked like commands and object imagery was discarded. The current account yielded only Goals, which should have been treated as a sparse-data design case rather than a successful visual review.

Header diagnosis: SharedLifeComposer places its header before BottomDrawerScrollView. BottomDrawer removes its handle layout spacer when that scroll view registers underlap; the scroll view adds the allowance inside its own content. The preceding header therefore misses that allowance. Use the standard scroll-owned header placement, or explicitly support a fixed-header slot in the shared primitive; do not compensate with arbitrary feature padding.

The footer is a real semantic BottomDrawer footer. Its use on a selection step is still inappropriate. Drawer guidance explicitly says composers retain their own input anatomy. These sketches reserve a compact header Post action for draft review.

## Anchor

`jtbd-invite-the-right-people-in`: recognize a specific moment, then knowingly choose who sees it. Audience is explicit in draft review, not a prominent unexplained pill before selection.

## References

- Kwilt MealSetupDrawer: standard scroll-owned header and bounded task anatomy. Copy containment ownership, not its form rows.
- Apple Photos / share memories: begin with an existing recognizable object. Translate object-first selection, not generated memory movies. https://support.apple.com/en-mide/guide/iphone/iph2af67b000/ios
- Pinterest / create a Pin: select imagery, then supply descriptive details. Translate media-first pacing and subordinate metadata, not a public distribution model. https://help.pinterest.com/en-gb/article/create-a-pin-from-an-image-or-video
- Airbnb listing-detail study in docs/design-system/references: identity and imagery before practical metadata. Translate hierarchy, not reservation controls.

## Three directions

A — Two moments (recommended): two larger previews, quiet title/source beneath each, see more, then writing/photos. Best for low effort recognition. Fails if ranking or imagery is weak.
B — Visual collection: one larger preview plus two smaller peers. Best for mixed visual activity. Fails with missing imagery or very long titles.
C — Compact picker: three thumbnail rows in a shorter sheet. Best for quick scanning and inconsistent image coverage. Less expressive; risks returning to an activity-list feeling.

All advance to the same draft review with a small explicit audience line, selected object, optional caption and header Post. No overflow menu or Post footer on selection. Choosing from the picker must never immediately publish.

## Recommendation and next iteration

Bet: recognition is the main blocker. Start from A and validate whether Andrew can immediately spot something worth sharing. If it feels too curated or hides relevant options, try B; if it feels too large, try C. Review the actual sparse and no-thumbnail cases before implementing.

Production follow-through after direction choice: use actual object thumbnail data; do not invent imagery or fill source diversity with fake events. Cap the initial preview at two for A, prefer source variety when supported by real recent records, and avoid filling the entire sheet with Goals when other sources are absent. Goal completion dates need an actual completion event, not updatedAt. Preserve saved draft/photo state through selection/back, include the audience's exact disclosure, and recheck long captions with keyboard visible. These behaviors are not fully represented by this disposable mockup.

Visual QA: rendered all three entry states and the draft review in headless Chrome; adjusted sheet height so writing/photos remain visible. Native app files were not changed in this revision. This artifact is for fast comparison, not native visual acceptance.

## Revision 3 — starting points and sharing a copy

Replace time-assuming copy with “Suggested moments.” Separate the suggested objects from a “Start a new post” command, explained by “Write something, add photos, or both.” Both routes produce the same kind of editable post. Added photos belong to the post and do not mutate a selected Goal, Place or Meal. Preserve text and photos when changing a source in the eventual native implementation.

The ?flow view illustrates A, draft review, and a proposed after-publication action. After successful Home publication, offer “Share outside Kwilt”; expose it again on the user's post for later use. Package the approved caption and user-selected imagery or a readable moment card for the native share sheet, useful without requiring recipients to sign into Kwilt. A link, if supplied later, retains its original access restrictions. External recipients are chosen explicitly through the share UI; the Kwilt household audience is not a Messages group mapping. Do not silently send, widen Home visibility, or claim delivery merely because the share sheet opened. Cancellation leaves the Home post intact. Shared copies have an independent lifetime outside Kwilt.

This is a proposed capability, not an existing native feature. Native media export, available share targets, multi-image/text preservation, cancellation and recipient selection need implementation and device proof. System basis: https://developer.apple.com/documentation/UIKit/collaborating-and-sharing-copies-of-your-data and https://support.apple.com/en-ca/guide/iphone/iphf28f17237/ios . The mock action only explains the intended handoff and sends nothing.

## Revision 4 — accepted picker and contextual sharing

Andrew prefers the compact horizontal thumbnail cards: three initial suggestions, followed by “View more.” Keep the separate “Start a new post” choice and common composer. The flow prototype now uses the compact list; View more opens a scrollable collection of six illustrative entries.

Replace the standalone post-success screen with return to Home and “Posted to Home · Share” in the confirmation toast. The created feed item has one Share action in its existing action row; the moment detail retains that same row. All three entry points resolve the same posted snapshot and share preparation. The toast is optional convenience, never the only route. Draft review is not an invitation to export unpublished material as though it were posted.

Growth posture: the shared content is useful on its own. A small Kwilt attribution on an exported card and an optional View in Kwilt link offer discovery without rewriting the user's caption, forced invitation copy, a contact-upload request, or a required install to understand the shared copy. Original post links continue to enforce audience rules; opening a private link is not a permission grant. Public web previews, if desired later, require an explicit scope decision and should not be silently created by this share action. Respect the eventual content/author sharing policy and do not re-export private replies or source details absent from the reviewed post. Attribution and links are proposed export behavior, not implemented by the mock share preview.

Prototype QA: rendered the three-step flow; feed action, toast and detail use the same mock handoff; no native app code changed. Screenshot: feed-sharing-flow.png. The ?detail view exposes the detail layout independently. Native share sheet, rich link previews and growth attribution still need implementation and device proof.

## Revision 5/6 — clear value invitation and integrated composer

Replace the administrative “Start a new post” row with a soft entry surface: “Share a story or photo” / “Help family and friends catch up with you.” Andrew rejected “Let your people in” as inconsistent with the copy guidelines; use concrete action and relational value rather than that metaphor.

The entry surface offers Write a note and Photo, retaining the explicit “Words, photos, or both.” The draft mockup adopts the supplied reference's grouped writing surface with Photo, Recent moment and Post in one toolbar. Header Post is removed to avoid duplicate publication actions. This is a proposed composer-local action region, not a semantic drawer footer. Native implementation must verify keyboard reachability, long text, accessibility targets and retained content when choosing another moment. Do not reinstate the former obstruction through visual imitation of the reference.

Rendered and inspected invitation-flow.png; actual application files remain unchanged. The illustrative flow caption is sample content, not an account draft. Prototype share and photo actions remain explanatory only.
