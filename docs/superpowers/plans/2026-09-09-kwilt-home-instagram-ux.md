# Kwilt Home Instagram UX Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement task by task, inline in the normal checkout. Use subagent-driven-development only if Andrew explicitly requests delegation. Preserve unrelated changes; do not create a worktree automatically.

**Goal:** make Home an expressive, dependable place to share and respond to everyday life, applying the [40-learning catalog](../../design-explorations/kwilt-home-instagram-ux/catalog.md).

**Architecture:** retain the existing Home post, audience, source-delivery, and automatic-chore domains. Improve presentation and interaction through reusable post parts, a virtualized stream, a content-led composer, and additive authorized data for people/history. New views project existing posts rather than create competing stores.

**Tech stack:** React Native / Expo, existing `src/ui` primitives and theme, Jest, Supabase PostgreSQL/RPC and private media storage.

**Status:** Connected Moments v2 implementation is present in the normal checkout. The canonical v2 PRD supersedes the earlier phased scope below, including collections in this implementation. Backend migrations are deployed. See [implementation evidence](../../../artifacts/home-sharing-review/connected-implementation/verification.md) for verification and remaining release boundaries; the original checklist is retained as planning history.

**Refinement after mockup review:** the [Connected Moments brief](../../feature-briefs/kwilt-home-connected-moments.md) now governs the eight refined concepts. Follow its single Post action, authored-only finite catch-up, private collections, per-post seen rule for tall content, source action availability, and explicit cancellation/uncertain-publication lifecycle where earlier steps below offer broader choices. The [concept index](../../design-explorations/kwilt-home-ready-concepts/README.md) maps all eight outcomes and learning releases.

## Scope and dependencies

**Design-system requirements for Concept 02:** follow the v2 PRD's DS-01–DS-04 requirements. Use canonical neutral primary/ghost controls, not green accent/link overrides; a single list-owned 32-point post separator with 16-point text gutters; prescribed within-post gaps; canonical typography and dock geometry. The generated image does not override those measurements or component semantics. The editor is page-style full-screen with one bottom Post action; the existing drawer is a migration starting point, not the new layout authority.

| Bundle | Outcome | Dependencies | Schema |
|---|---|---|---|
| A | Expressive mixed feed, media browsing, dependable responses and scrolling | Current Home implementation | Optional media dimensions; existing photos supported without them |
| B | Content-led sharing and consistent source offers | A post-body presentation | No audience widening; publishing lifecycle changes only if required |
| C | People history, saved moments, real catch-up | A/B plus authorized projections | Saved posts, seen state, safe person/reaction summaries |
| D | Clips, collections, journal, further source adapters | A–C foundations; format-specific design | Separate additive migrations per approved format |

A is the first useful release, B the next. C should ship as complete independent capabilities rather than empty icons. D is a preserved roadmap, not a hidden prerequisite for shipping A.

## Task 0 — Establish acceptance fixtures and baseline

**Files:** extend `src/features/dev/HomeChorePreview.tsx` only if its fixture harness can be shared cleanly; otherwise create `src/features/dev/HomeFeedPreview.tsx` and `src/features/shared-home/sharedLifeFixtures.ts`. Register the preview in `src/features/dev/DevToolsScreen.tsx`. Update the existing Home brief only when implementation begins; this proposal does not change its accepted scope or shipping status.

- [ ] Inspect branch, HEAD, dirty files and affected source again before editing; reuse the current checkout.
- [ ] Define a deterministic fixture matrix: text-only; one landscape photo; four portrait/landscape photos; long caption/name; place; completed goal; one and grouped chores; pending approval; delayed chore report; Needs you invitation; empty; revoked post; failed image; failed reaction.
- [ ] Keep fixture generation local and clearly fictional. Use disposable accounts for actual RPC flows. Never auto-publish fixtures into Andrew's household.
- [ ] Capture the current populated feed and record device, source revision/dirty state, installed build and Metro provenance. Establish current scroll/render behavior with 100 mixed fixture items.

**Acceptance:** every later screenshot and test names its fixture, source revision, and evidence class. Existing empty-state screenshots are not the populated baseline.

## Task 1 — Build the post grammar and Home header

**Modify:** `src/features/shared-home/SharedLifeFeed.tsx`, `SharedLifePostCard.tsx`, `SharedLifeChoreCard.tsx`.

**Create under `src/features/shared-home/`:** `SharedLifePostHeader.tsx`, `SharedLifePostActions.tsx`, `SharedLifePostBody.tsx`, `SharedLifePostCard.test.tsx`. Reuse `src/ui/ProfileAvatar.tsx`; inspect existing theme and button primitives before selecting sizes/icons.

- [ ] Implement the common header with avatar/name, visible audience, time, and overflow. Start with initials from known names; only render remote avatars supplied through an authorized source.
- [ ] Make photo body lead and caption follow; keep text-only body prominent. Use controlled More/Less expansion and preserve expanded state by post ID.
- [ ] Keep chores compact with the current grouped/pending/source semantics; do not substitute a personal author for a system post.
- [ ] Replace the wrapping toolbar with a compact view picker and persistent accessible Create action. Preserve People, My posts and Saved places as reachable destinations; do not render generic Save before Task 6.
- [ ] Preserve Needs you as a conditional actionable group with a bounded summary and explicit Review path when numerous.
- [ ] Test meaningful branches: null-author chore, household audience, long text expansion, owner versus other-person overflow, and a source attachment whose action is unavailable.

**Acceptance:** the first populated viewport communicates an actual moment; author/audience/action remain legible at large text. Home remains first in the main menu. Filter selection cannot mutate composer audience.

## Task 2 — Make photos a complete reading experience

**Modify:** `SharedLifePostBody.tsx`, `sharedLifeTypes.ts`, `sharedLifeMedia.ts`, `sharedLifePublishing.ts`.

**Create:** `SharedLifeMediaGallery.tsx`, `SharedLifeMediaViewer.tsx`, `SharedLifeMediaGallery.test.tsx` under the same feature directory. Extend `sharedLifeMedia.test.ts` and `sharedLifePublishing.test.ts`.

- [ ] Add optional `width` and `height` to media metadata. Use a backward-compatible fallback when either is absent/invalid; old published posts remain readable. If the RPC rejects extra metadata, add a new timestamped migration after inspecting the current schema; do not edit deployed migrations.
- [ ] Use one horizontal gallery for the existing maximum of four photos, visible position, and explicit accessible next/previous. Preserve each post's index outside recycled cells.
- [ ] Open full-screen media from the current index with Close returning to the same post and scroll position. Show the complete image; bounded feed cropping must not discard the only view of the image.
- [ ] Keep image authorization on the existing media path; do not replace protected reads with public URLs or long-lived unrevocable disk caches.
- [ ] Cover missing dimensions, failed second photo, retry, close/reopen index, account switch while viewing, and revoked media while the viewer is open.

**Acceptance:** one/four photos, portrait/landscape, slow network, VoiceOver and large text work on native. Photo upload must still be idempotent and source audience unchanged.

## Task 3 — Preserve reading through refresh and pagination

**Modify:** `SharedLifeFeed.tsx`, `useSharedLife.ts`, `useSharedLife.test.ts`. Inspect/reuse `src/ui/layout/CanvasFlatList.tsx` and `src/ui/KwiltRefresh.tsx`.

**Create:** `sharedLifeFeedState.ts` and `sharedLifeFeedState.test.ts` for reconciliation logic.

- [ ] Write failing regressions for a new head post arriving after two pages, an existing deleted post, repeated page cursors, and a stale response from the previous account.
- [ ] Separate head fetching, refresh of loaded IDs, and older pagination. Deduplicate by stable post ID; maintain chronological ordering and reject stale generations.
- [ ] Replace the all-content ScrollView with the existing canvas list authority, using stable typed keys for posts and deliveries. Keep one owner of vertical scrolling.
- [ ] Queue new head moments behind a New moments affordance when the reader is below the top. Insert only on intentional refresh/activation; preserve the visible anchor through updates.
- [ ] On transient refresh failure, show retry without destroying still-authorized content. On logout, account change, household-mode change, or confirmed access loss, clear protected content immediately.
- [ ] Validate 100 mixed rows, rapid filter switching, older loading plus refresh, return from viewer/conversation, and memory behavior on a signed device.

**Acceptance:** no duplicate rows, jump to top, resurrected deleted content, or old-account flash. Pull to refresh is available; errors identify the failed operation.

## Task 4 — Make appreciation and conversation responsive

**Modify:** `SharedLifeFeed.tsx`, `SharedLifePostActions.tsx`, `SharedLifeConversation.tsx`, `sharedLifeRepository.ts`.

**Create:** `useSharedLifeReaction.ts` and `useSharedLifeReaction.test.ts`.

- [ ] Write failing tests for rapid on/off/on taps, a rejected request, a late response, and simultaneous reactions on two different posts.
- [ ] Track authoritative state, latest local intention, and request sequence per post. Serialize/coalesce each post's requests so an older response cannot overwrite a newer intention. Roll back the latest failed intention with a local retry affordance.
- [ ] Remove the global mutation lock for independent reactions; retain necessary publication/deletion guards. Announce selected state accessibly.
- [ ] Add a compact original-moment preview to conversation, author/time headers for replies, per-reply overflow, and a keyboard-safe reply composer. Preserve typed reply on recoverable failure.
- [ ] Verify delete/report authority and revoked-post closure through the existing RPC contracts.

**Acceptance:** appreciation feels immediate, one failed request does not freeze the stream, and a conversation remains recognizably about its original moment.

## Task 5 — Make composition start with the moment

**Modify:** `SharedLifeComposer.tsx`, `SharedLifeComposer.test.tsx`, `sharedLifeDrafts.ts`, `sharedLifePublishing.ts`, `sharedLifePublishing.test.ts`, `sharedLifeCelebration.ts`, `sharedLifeCelebration.test.ts`.

- [ ] Support direct Photo and Write intentions while using one draft model and one publication pipeline. Cancellation of photo permission/selection returns to a usable draft.
- [ ] Show selected media/source preview first, then caption and an always-visible audience summary. Open a focused audience picker on demand; reiterate the audience beside Post.
- [ ] Keep household, selected people, and approved followers semantics. A chosen feed view never broadens a draft's audience; unavailable recipients require explicit correction before publishing.
- [ ] Preserve source offers immediately after successful Goal/Explore actions. Retain the existing prior-draft handoff behavior and Share/Continue escape routes. Chores remain automatic system updates.
- [ ] Define publication states explicitly: editing → uploading → publishing → published, with recoverable failure at either network step. Disable duplicate submission, retain draft until confirmed success, and use the existing idempotency identity for retries.
- [ ] During upload, closing the editor leaves the operation visibly tracked; if the existing architecture cannot keep it running safely, require an explicit stop choice and retain the draft. Never imply continued upload when none occurs.
- [ ] Test photo cancellation, draft restoration, source offer while another draft exists, audience removal, upload retry, uncertain publish response, and successful return to the new post.

**Acceptance:** sharing a photo feels like editing a moment, with recipient clarity throughout; neither a lost network response nor double tap creates duplicate posts.

## Task 6 — Add people, saved moments, and truthful catch-up

**Modify:** `SharedLifeConnections.tsx`, `SharedLifeFeed.tsx`, `sharedLifeTypes.ts`, `sharedLifeRepository.ts`, `useSharedLife.ts`.

**Create under the feature:** `SharedLifePersonHistory.tsx`, `SharedLifeSavedMoments.tsx`, `SharedLifeCatchUp.tsx` with focused state tests. Add new timestamped migrations under `supabase/migrations/` and regression scenarios under `scripts/shared-life/` after checking existing table/function names.

- [ ] Add authorized person history and relationship status using existing post visibility. Membership, following, and post audience remain distinct; avoid a public child profile from chore attribution.
- [ ] Add private saved-post records keyed by viewer and post, idempotent save/unsave RPCs, and an authorized saved-list projection. Preserve saved places and expose them as a subset. Withdrawal/revocation removes content access despite a saved reference.
- [ ] Add bounded reaction-person summaries only for viewers already allowed to see the post. Do not request the entire user directory to populate an appreciation line.
- [ ] Define seen state per account and view: record a post as seen after meaningful visibility, not merely downloading it; for the first implementation use at least 50% visibility for one continuous second, pausing in background. Keep read state private and monotonic.
- [ ] Add catch-up rail/new-response indication only after the projection can truthfully identify authorized unseen content. Changing filters does not mark hidden posts seen.
- [ ] Run database tests for save privacy, revoked access, new follower/no backfill, household removal, reaction-summary visibility, repeated seen updates, and account isolation.

**Acceptance:** people and saved views reveal no new content authority; catch-up never invents activity. Each subfeature ships only with its real destination and empty/error states.

## Task 7 — Expand the expressive system

These are deliberate next capabilities with useful outcomes, not required decoration for A–C.

- [ ] **Collections / journal:** design private versus shared collection ownership, membership changes, ordering, and withdrawn posts; build views over existing authorized posts. Define time-zone behavior for day grouping. Keep optional Chapter interpretation separate from factual history.
- [ ] **Short clips:** specify duration/size limits, upload recovery, transcoding/storage costs, captions, playback ownership, sound defaults and reporting before implementation. Add compatible media types; old clients must fail safely. Do not ship a video icon backed by still-image infrastructure.
- [ ] **Stories:** compare durable Today catch-up against true expiry. If expiry is valuable, define author archive, viewer expiry, download/cache removal and response retention together. Do not promise ephemerality with only a hidden feed item.
- [ ] **Capability adapters:** inventory actual success events for Meals/Games and other candidates; map each to the existing shared offer and approved snapshot. Maintain immediate Goal/Explore offers and automatic household Chores semantics.
- [ ] **Sharing onward:** design recipient intersection and original-author control before adding send/repost. Private source content cannot become broadly visible because a recipient presses a familiar icon.

## Verification and release

During implementation, run focused tests first; logic and regressions stay red/green. Example exact focused commands using planned test filenames:

```sh
npm test -- --runInBand --runTestsByPath src/features/shared-home/sharedLifeFeedState.test.ts src/features/shared-home/useSharedLifeReaction.test.ts
npm test -- --runInBand --runTestsByPath src/features/shared-home/SharedLifeComposer.test.tsx src/features/shared-home/sharedLifePublishing.test.ts
```

Expected: all selected cases pass, including failed-request recovery and authorization transitions—not merely snapshots. At each completed implementation bundle run `npm run verify:changed -- --run` once. Run migration scenarios for changed RPCs. Broaden tests only when affected selection is insufficient or a release gate requires it.

Native acceptance: populated feed, photo selection and viewer, caption expansion, audience picker, keyboard/replies, pull refresh, older pagination, offline retry, rapid account switch, large text, VoiceOver, reduced motion, safe areas, and 100-item scroll. Preserve Home top-menu placement and Needs you actions. Save and display actual screenshot files, identifying fixture/test-account content.

Rollout: existing Home feature gate → native dev verification → signed internal build → controlled release. Keep source/test, database, Simulator, signed-device, and production evidence separate. Roll back presentation via the gate; keep schema additive and preserve drafts/posts. After observation, update the [design learning record](../../design-explorations/kwilt-home-instagram-ux/design.md) and relevant job-flow evidence.

## Coverage check

Catalog 01–11 and 35 → Task 1; 13 and 16–21 → Task 2; 36–38 → Task 3; 22 and 24–26 → Task 4; 30–34 → Task 5; 12–15, 23, 27 and 39 → Task 6; 19, 28–29, 33 and 39–40 → Task 7. All 40 learnings have a build destination; roadmap items are explicitly separated from the first release.
