# Instagram UX learning catalog

September 9, 2026 · 40 learnings · Proposed applications, not shipping claims

## Evidence key

- **S1:** Andrew's screenshot with header, people/story rail, tall media, and floating navigation.
- **S2:** Andrew's screenshot with author headers, photograph, response strips, captions, timestamps, and an ad.
- **D1:** Meta's March 2022 announcement documents Following and Favorites views, including chronological ordering. It supports giving people control over their view; it does not prove today's exact menu on every account. [Two New Ways to Control Your Instagram Feed](https://about.fb.com/news/2022/03/two-new-ways-to-control-your-instagram-feed/).
- **D2:** Meta's May 2021 announcement describes optional hidden like counts and mixed user preferences. It supports treating numerical prominence as a design choice. [Giving People More Control](https://about.fb.com/news/2021/05/giving-people-more-control/).
- **D3:** Meta's August 2025 announcement connects shared content with conversation, documents credited public reposts, and describes opt-in location sharing. These are references for system relationships, not a recommendation to expose Kwilt locations or repost private material. [New Instagram Features to Help You Connect](https://about.fb.com/news/2025/08/new-instagram-features-help-you-connect/).
- **P:** Proposed inference or improvement; not verified Instagram behavior.

Phases: **A** feed and response foundation; **B** composition; **C** people and revisiting; **D** richer formats and cross-capability expansion. Some patterns begin in A and gain depth later.

## People, hierarchy, and visual rhythm

| ID | Evidence and learning | Current Kwilt gap | Kwilt application / acceptance | Phase |
|---|---|---|---|---|
| 01 | S1/S2: recognizable faces precede reading. | Post author is a text button; no avatar. | Use `ProfileAvatar` with name fallback and an authorized photo when available. Name remains visible; household system actors cannot impersonate a personal account. | A |
| 02 | S2: content owns most of the available width. | Padded cards and nested attachment blocks compete with photos. | Let photo moments span the feed canvas; retain comfortable insets for words and actions. Compare actual small-screen screenshots, not just component previews. | A |
| 03 | S2: the same author/content/action sequence makes varied posts legible. | Text precedes every photo; chore and attachment structures diverge. | Common author and action grammar with content-specific bodies. A plain story is complete without an image; a chore stays compact. | A |
| 04 | S2: spacing can separate posts without surrounding every element. | Card framing is repeated inside a feed. | Use whitespace and restrained separators between authored moments; retain grouping where it conveys system state or a source attachment. | A |
| 05 | S2: different text weights distinguish identity, story, and metadata. | Buttons carry much of the typographic hierarchy. | Strong name, readable caption, secondary audience/time. Three-second test: identify person, moment, and intended viewers. | A |
| 06 | S2: long captions disclose more on demand. | All text renders at full length. | Collapse long captions after a sensible preview with accessible More/Less; expanded reading must not navigate away or lose scroll. | A |
| 07 | S2: relative age is quick to scan. | Calendar date alone is coarse for recent activity. | Relative time for recent posts, exact accessible date on detail; use actual event state for delayed chore reporting. | A |
| 08 | S1/S2: photos make everyday life the subject. | Empty Home uses a giant checklist illustration. | Warm, compact empty state with concrete photo/story entry choices and real connection invitations. Never seed fake household activity into the actual feed. | A |

## Navigation and finding your people

| ID | Evidence and learning | Current Kwilt gap | Kwilt application / acceptance | Phase |
|---|---|---|---|---|
| 09 | S1: a compact creation affordance is easy to locate repeatedly. | Large Share button occupies prime feed space. | Persistent, accessible create action in Home's header; empty state can still offer a labeled Share a moment button. | A |
| 10 | S1/D1: view selection can sit close to the destination title. | All, Household, My posts, and Saved places wrap across rows. | Compact labeled view selector; saved content has an explicit destination. Switching the feed view must never change the next post's audience or acting account. | A/C |
| 11 | S1: selected navigation is unmistakable. | Risk of copying an unrelated five-tab shell. | Keep Home first in the standard main menu and show its selected state clearly. Ask remains AI; a paper-plane icon must not imply social DMs that do not exist. | A |
| 12 | S1: a people rail offers a personal entry into content. | People is primarily a connection-management form. | Add meaningful person/household catch-up entries once authorized histories and unseen state exist. No ornamental story rings with invented activity. | C |
| 13 | S1: a partially visible next item teaches horizontal scrolling. | Any new rail or gallery will need discoverable continuation. | Use a next-item peek for people and visible page indicators for photos. Provide screen-reader position and explicit next/previous alternatives. | A/C |
| 14 | S2: identity can lead to more from that person. | Author tap only applies a filter. | A clear person history with relationship status and return-to-feed continuity. It shows only already-authorized posts; a profile is not an access grant. | C |
| 15 | S1: attention signals are near their destination. | No durable Home response-read model. | Add a calm New responses destination only with server-backed read state. Keep actionable Needs you recognizable and distinct from social activity. | C |

## Media and reading

| ID | Evidence and learning | Current Kwilt gap | Kwilt application / acceptance | Phase |
|---|---|---|---|---|
| 16 | S1/S2: image proportions vary with the moment. | Every photo uses a cropped 4:3 frame. | Preserve supported portrait/landscape compositions with bounded feed height; open the full image without cropping. Record dimensions for new uploads and safely fall back for older ones. | A |
| 17 | P, prompted by media dominance: multiple photos should read as one moment. | Up to four photos stack vertically. | Horizontal carousel for the existing four-photo limit; retain index per post through list recycling, with position text such as 2 of 4. | A |
| 18 | P: details deserve a focused viewing mode. | No dedicated full-screen photo reading path in the post card. | Full-screen viewer with close, next/previous, alt text, and restored feed position. Recheck authorization and clear revoked media. | A |
| 19 | S1: media state has a local visible control. | Current supported uploads are still photos. | Keep explicit playback/sound controls in the future clip design; sound off initially, one visible playing clip, pause on background. Video needs its own upload/transcode/caption lifecycle. | D |
| 20 | P: visual stability is part of reading quality. | Fixed placeholders cannot express real media geometry. | Reserve image space, isolate failed-image retry, and avoid shifting the post when media arrives. Test slow loading and one failed photo in a carousel. | A |
| 21 | P: the content should survive assistive reading. | A denser icon/media design could regress accessibility. | Preserve alt text, meaningful button labels and selected state, adequate contrast, large text, and 44-point targets; no gesture-only actions. | A–D |

## Appreciation, conversation, and returning

| ID | Evidence and learning | Current Kwilt gap | Kwilt application / acceptance | Phase |
|---|---|---|---|---|
| 22 | S2: responses sit immediately below their subject. | Cheer and Reply are generic text buttons. | Compact, consistent action row with legible icons, selected state, and accessible labels; retain the warm Cheer / Thanks distinction for moments / chores. | A |
| 23 | S2/D2: response information can include people as well as counts. | Only numeric reaction totals are available. | Later show authorized names such as Alex and Sam cheered; hide empty totals. Do not fabricate names from counts or rank household members by response volume. | C |
| 24 | P: response feedback should be immediate and reversible. | One global mutation lock and refresh can block unrelated actions. | Per-post optimistic reaction state with ordered requests, rollback, and retry. Rapid taps cannot drift the count; failure does not freeze the feed. | A |
| 25 | S2: caption and response controls belong to the same object. | Conversation can lose the photo context. | Open replies with an original-moment preview and composer anchored above the keyboard; retain caption and media context without duplicating a huge post. | A |
| 26 | S2: secondary actions live behind overflow. | Post menu and reply management render as inline buttons. | Consistent overflow for edit/delete/report, based on authority. Keep Report available and Delete scoped accurately; do not hide routine Reply there. | A |
| 27 | S2: bookmark is distinct from social actions. | Save exists only for places. | Private saved moments, with Saved places retained as a meaningful subset. A save neither notifies the author nor widens visibility; withdrawn content becomes unavailable. | C |
| 28 | D3/P: content can be a bridge to a conversation or activity. | Capability attachments are functionally useful but visually secondary blocks. | Rich place/goal previews and a single truthful source action. Sharing a place can lead to saving or planning a visit without sharing the whole Explore history. | A/D |
| 29 | S2/D3: sending and reposting are different intentions. | Copying those icons would promise missing capabilities. | Later consider sending an authorized post to an existing recipient; defer reposting until audience intersection and original-author controls are designed. Never forward private content as a new broader snapshot by default. | D |

## Sharing and system fit

| ID | Evidence and learning | Current Kwilt gap | Kwilt application / acceptance | Phase |
|---|---|---|---|---|
| 30 | S1/P: visible creation should meet the intent that started it. | The composer begins as a generic form. | Offer Photo or Write from direct entry; photo selection opens a content-led editor. Text-only remains one simple path, not a second-class fallback. Instagram's composer was not shown. | B |
| 31 | P: audience clarity can be compact without being hidden. | Multiple audience controls dominate the form. | Always-visible human-readable audience chip opening a focused picker, plus an explicit audience line beside Post. Never infer wider recipients from feed scope. | B |
| 32 | P: preview should resemble the published result. | Photos/attachments appear after substantial form content. | Reuse post-body presentation for draft preview, then caption and audience. Publishing one/four photos should produce the same ordering the author reviewed. | B |
| 33 | P: an offer works best at the source moment. | Goal/Explore adapters exist; broader capabilities can drift into different patterns. | Successful source action → shared celebration → Share/Continue → shared composer. No repeat entry; dismiss never reverses source success. Chores intentionally bypass this offer. | B/D |
| 34 | P: completion is a lifecycle, not a tap. | Draft/upload behavior needs clearer visible progress and recovery. | Local draft durability, progress, idempotent retry, and a clear published result. Close during upload must have defined behavior; no false success or duplicate post. | B |
| 35 | P: small household contributions deserve proportionate presence. | Automatic chores now exist and can compete with authored moments. | Compact grouped system updates with actor, household, truthful pending/approved status, Thanks, and expandable detail. Keep authored photos and stories expressive. | A |

## Continuity and richer possibilities

| ID | Evidence and learning | Current Kwilt gap | Kwilt application / acceptance | Phase |
|---|---|---|---|---|
| 36 | P: long feeds need continuity, not just more rows. | `ScrollView` renders all loaded posts. | Virtualized mixed list with stable keys, stable media geometry, pagination guard, and return-position preservation. Validate with 100 mixed items on device. | A |
| 37 | P: new content should not interrupt current reading. | 30-second refresh can replace lists; older-page mode refreshes existing IDs rather than fetching new head items. | Separate head refresh, existing-item reconciliation, and older pagination. Queue new moments behind a visible affordance; preserve anchor. Do not confuse transient network errors with revoked access. | A |
| 38 | P: recovery is part of the normal experience. | Refresh failure can clear content; generic loading occupies the whole surface. | Distinct initial load, refreshing, empty, offline, permission loss, and retry states. Retain data only while authorization remains valid; clear on account switch or revocation. | A |
| 39 | S1/P: a short catch-up experience could make ordinary sharing easier. | No Stories lifecycle or unseen cursor exists. | Explore a durable Today catch-up rail first; consider ephemeral stories separately with explicit expiry/archive rules. A circle alone is not a story product. | C/D |
| 40 | P: shared moments can compound into family memory. | Stream history is the primary revisit path. | Add chosen collections and a household journal, then consider opt-in retrospective Chapter input. Distinguish a factual post collection from AI interpretation and never auto-publish a retrospective. | D |

## Transfer across Kwilt

| Capability or shared surface | Transfer worth making | Preserve |
|---|---|---|
| Explore | Photo/place-first recap; one truthful next action; same share editor and audience controls. | A saved place is not live location, and an uncertain recording does not prove a visit. |
| Goals | Meaningful completion preview, recognizable supporters, contextual conversation. | Goal audience and private encouragement remain independent from Home post audience. |
| Chores | Recognizable contributor and easy Thanks; compact grouped activity. | Automatic household-only posting, truthful approval state, undo reconciliation. |
| Meals / Games | Future completed-meal or shared-game moments can use the same presentation and handoff. | A meal plan is not proof of cooking; a game invitation is not proof of playing. Define actual source events before adapting. |
| Shared UI | Avatar/name grammar, nearby actions, content-aware loading, overflow, return continuity. | Existing tokens, layout authorities, accessibility, and each capability's task hierarchy. |
| Other operational capabilities | Audit hierarchy and response latency after Home patterns prove useful. | This is not a proposal to turn financial review, safety controls, or every detail screen into a feed. Separate capability review precedes changes. |

## Preserve / translate / reject

**Preserve from the reference:** content prominence, identity, predictable post structure, nearby responses, clear selection, and contextual secondary actions.

**Translate for Kwilt:** likes into appreciation; story rails into truthful catch-up; bookmarks into private revisiting; activity into calm response awareness; rich attachments into participation opportunities; content-first design into both visual and text-only moments.

**Reject as defaults:** public reach, automatic redistribution, engagement-ranked household worth, ad-shaped interruptions, unexplained red urgency, automatic location exposure, and a replacement five-tab shell. These are fit decisions, not claims that every Instagram account behaves identically.
