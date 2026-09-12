---
id: brief-kwilt-home-connected-moments
title: Kwilt Home — Connected Moments v2 PRD
status: accepted
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-invite-the-right-people-in, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-home-shared-life]
owner: andrew
last_updated: 2026-09-09
---

# Kwilt Home — Connected Moments v2 PRD

**Product requirements document · September 9, 2026 · Implementation present; release verification tracked separately.**

This is the canonical PRD for [Concept 02](../../artifacts/home-sharing-review/instagram-concept/home-conversation-composer-v2.png): Home, its post conversation, and the shared editor, including the connected catch-up and Saved destinations. It retains the eight concept contracts below and adds binding design-system corrections. The image is a composition reference with fictional content, not a token specification or production screenshot.

**Current user correction:** remove the green buttons and ensure appropriate padding/margins between posts. The design-system requirements in this PRD override green fills, green links, green selection rings, dense typography and compressed spacing in the generated image. Implementation evidence and remaining release checks are recorded in [the verification record](../../artifacts/home-sharing-review/connected-implementation/verification.md).

## Product outcome and scope

Home should help people feel included in the ordinary lives of their household and chosen connections. A successful visit can be brief: catch up, appreciate, reply, share, save or follow a useful source action, then leave with context intact.

The v2 release scope comprises all C1–C8 concepts below. The three-screen mockup illustrates only their central paths; people history, finite catch-up, Saved/collections, audience selection, media viewer and failure states are required supporting surfaces. Phase sequencing does not remove them from the defined product.

Preserve the current adult personal-account eligibility, Home's first position in standard main navigation, source-owned Needs you actions, three explicit posting audiences, four-photo support, and automatic household-only chore updates. Personal moments require explicit publication. Chore completion stays automatic and does not interrupt with a share offer.

Excluded from this version: social DMs, public discovery/ranking, new picnic/event invitations, clips, ephemeral Stories, shared collections, AI-generated journal publication, expanded child feed access and new notification campaigns. These remain distinct roadmap decisions.

## Requirements and release acceptance

| ID | Required user behavior | Acceptance evidence |
|---|---|---|
| HOME-01 | Open Home from the first main-menu item, select a view, and reach People or Saved. | View/account/post-audience remain independent; no new bottom tab shell. |
| HOME-02 | Use the people rail to read a finite set of authorized new authored moments. | C1 unseen/deduplication/removal scenarios; no chore inflation or author read receipts. |
| HOME-03 | Read photo, text, goal, place and chore content with a consistent identity/audience grammar. | C3/C5 realistic mixed-feed screenshots and state comprehension. |
| HOME-04 | Cheer/Thank, inspect real responders, read one reply preview and enter its thread. | C2 authorization, deletion and request-order tests plus native reply flow. |
| HOME-05 | Open a source-backed action whose label and availability are truthful. | C4 capability authority, unavailable/handled states and exact return. |
| HOME-06 | Save, organize and refind a moment privately, separately from importing a place to Explore. | C6 lifecycle, current authorization and collection-deletion checks. |
| HOME-07 | Enter one editor from Photo, Write or a successful source offer; publish to an explicit audience. | C7 draft, permission, prior-offer, retry and uncertain-result scenarios. |
| HOME-08 | Navigate and return without losing reading/draft context or displaying stale-account data. | C8 anchor, refresh, paging, revocation and account-switch checks. |
| DS-01 | All ordinary actions and selected/confirmed states use the neutral system treatment. | No green Create, Post, Send, Review, Explore action, selected thumbnail/ring or draft-status treatment. |
| DS-02 | Posts have clear boundaries, while each post's content and responses remain grouped. | Measured token spacing and visual checks at narrow/default/large text sizes. |
| DS-03 | Controls, typography, surfaces and bottom geometry use current Kwilt authorities. | Reuse review, component maturity check, no feature-owned button colors/shapes or safe-area math. |
| DS-04 | All primary flows remain usable with keyboard and assistive technology. | 44-point targets, focus return, VoiceOver/TalkBack labels, Dynamic Type and reduced-motion proof. |

## Design-system pass — binding specification

### Authority and reference treatment

Authority: current user instruction → platform/accessibility requirements → [UI constitution](../design-system/ui-constitution.md), [semantic color](../design-system/semantic-color.md), canonical tokens/components/patterns → scoped upstream component anatomy → accepted local precedents → concept image. The older `docs/ux-style-guide.md` still describes pine primary buttons; it is stale on this point and does not override the current constitution, inventory or tokens.

Native host: the root React Native/Expo application. Keep `StyleSheet`, `src/theme` bridges and `@kwilt/tokens`; no dependency or styling migration is required by this PRD. React Native Reusables remains an anatomy reference only; no new upstream component is selected/localized here.

**Preserve from Concept 02:** recognizable people, generous media, compact contributions, contextual replies, one editor action. **Translate:** all color, type, spacing, controls, safe areas and keyboard behavior through Kwilt. **Reject:** green ordinary controls/status, screenshot-measured pixels, small squeezed captions, crowded post boundaries and using the device-frame image as a layout constraint.

### Color and control contract

| Mockup element | Required Kwilt treatment |
|---|---|
| Green circular Create | Canonical `Button` primary icon treatment: Sumi fill and inverse icon, accessible label “Share a moment,” 44-point target. |
| Green Post to household | `Button variant="primary"`, one persistent editor action, inverse label; no background/radius overrides. |
| Green reply Send | Canonical primary icon Button within the reply region; Sumi/inverse, explicit “Send reply,” busy and disabled semantics. |
| Green Review / Save to Explore | Quiet `ghost` action with neutral text/icon and explicit verb. Do not use the current green-toned `link`, `accent` or `cta` variants for these controls. |
| Green people rings / thumbnail selection | Neutral border/weight or check plus explicit new/selected text. Color alone does not convey status. |
| Green Draft saved check | Neutral check and secondary text. Ordinary confirmation is not a brand-green moment. |
| Cheer / Thanks / bookmark | Neutral outline resting state; filled neutral icon and accessible selected state when active. |
| Tinted invitation/source blocks | Neutral surface such as `colors.shellAlt` only where it clarifies an action boundary; no decorative sage fill. |

Use `colors.canvas`, `colors.card`, `colors.textPrimary`, `colors.textSecondary`, `colors.border` and canonical Button semantics. Current primary/text ink is Sumi (`#1C1A19`); cite that as the inspected value, never hardcode it in feature styles. Photos and authorized avatars retain their natural colors. Error/destructive behavior uses existing semantic variants. No hue substitution is needed to replace green.

Disabled Buttons retain their variant at the component's disabled opacity; loading uses full-strength busy state with canonical `KwiltLoader` and an accurate label. Missing prerequisites receive nearby guidance rather than a silently dead button.

### Spacing and ownership

All numbers below are logical React Native points mapped to the existing spacing scale: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=24`, `2xl=32`, `3xl=48`. They are proposed composition values drawn from Kwilt's tokens, not pixels measured from Instagram or the generated board.

**Post boundary rule:** exactly `spacing.2xl` (32) between the final visible element of one post and the next post's author row. The list separator owns this space; post containers have zero external vertical margin. Split it into 16 + optional hairline + 16 if a boundary needs a divider; do not add a second 32-point gap around that divider. Use the same boundary for photo, text and chore posts so compact contributions still have a distinct beginning and end.

| Relationship | Required default | Owner |
|---|---|---|
| Main feed text/header side gutters | `lg` / 16 each side | One shared content inset wrapper per post region |
| Photo gallery width | Full feed canvas width; no inherited text inset | Gallery; no negative-margin nesting |
| Avatar to author text | `md` / 12 | Post header |
| Name to audience/time | `xs` / 4 | Header text stack |
| Author row to content body | `md` / 12 | Post body composition |
| Photo to response row | `sm` / 8 visual separation, with 44-point action targets | Post action region |
| Response row / appreciation / caption groups | `sm` / 8 between present groups | One post-content stack; no spacer for absent group |
| Caption to source preview | `md` / 12 | Post body |
| Source/body to reply preview | `md` / 12 | Post social region |
| Reply text to View comments | `xs` / 4 | Reply preview |
| Source preview internal padding | `md` / 12; thumbnail/text gap `md` / 12 | Source preview, not outer post |
| Header to people rail | `md` / 12 | Scroll header beneath shell header |
| Between rail items | `lg` / 16; name/new-label gap `xs` / 4 | Rail; fixed readable items, horizontal overflow |
| Rail to Needs you | `lg` / 16 | Scroll header; collapse absent region |
| Last header region to first post | `xl` / 24 | Scroll header; not first-post margin |
| Needs you interior | `md` / 12, 44-point action target | Action group; wrap long copy |
| Conversation side gutters | `lg` / 16 | Conversation body |
| Original-moment preview to first reply | `xl` / 24 | Conversation list header |
| Between separate replies | `xl` / 24; avatar/text gap `md` / 12 | Conversation list separator |
| Reply author to body | `xs` / 4 | Reply row |
| Editor body section gaps | `xl` / 24; thumbnail gaps `sm` / 8 | Editor content stack |
| Editor text/content side gutters | `lg` / 16; gallery may span canvas | Editor body wrapper |

Padding belongs inside a surface; margin/separators express relationships between surfaces. Never stack Card default `marginVertical`, list `gap`, post padding and ItemSeparator spacing. A reply preview must be visually closer to its own post than the next author is. Do not put every post in a Card merely to obtain padding.

Bottom regions are exceptions to the ordinary 16-point body gutter: **canonical dock geometry owns their optical inset, safe-area lift, keyboard relationship and scroll clearance**. The page editor uses `FullWidthActionDock` and its current 24-point inline geometry, not a hand-built sticky footer. The body must scroll completely above it. If the editor is implemented as a drawer, use `BottomDrawer.footer` with its canonical intrinsic trailing action anatomy instead; do not combine page dock and drawer footer. For v2, choose the page-style full-screen editor shown in the concept. Use canonical resting-composer geometry for the conversation input and revalidate its Home-specific integration. Safe area is applied once by the owning frame, never again in the child input or list.

### Typography, density and surfaces

Use current Inter-based typography; Urbanist remains the brand wordmark font, not a replacement body face. `titleMd` (24/28) for Home unless the existing shell header owns its token; `titleSm` (18/24) for Conversation/editor titles; `bodyBold` (17/24) for author identity; `body` (17/24) for captions, stories, editable text and replies; `bodySm` (14/20) for audience, timestamps, rail labels, place metadata and appreciation summaries. Do not shrink body text to fit the number of rows in the generated image. Quiet metadata remains readable and accessible.

Use neutral canvas as the base, flat authored posts, and restrained separators. A compact source/action preview may have its own meaningful neutral surface; avoid multiple nested cards. Text-only stories use the same body type and post boundary as photos. A chore card is compact through shorter content and grouped details, not smaller unreadable type or reduced touch targets.

At default text size on a narrow supported phone, show the first author and a meaningful part of the first moment below the rail and optional Needs you. At accessibility sizes, allow the header/rail to grow and scroll naturally; never shrink labels or overlap them to meet that visual target. Long names truncate visually only where necessary, with full accessible names; audience and source-state meaning must remain available.

### Component reuse and composition maturity

| Need | Local authority / candidate | Boundary |
|---|---|---|
| Primary and contextual controls | Canonical `src/ui/Button.tsx`, `buttonTokens.ts` | Layout-only feature overrides; shared semantics own shape/color/states. |
| Text entry | Canonical `src/ui/Input.tsx` and Typography | Visible/accessible labels, multiline and error anatomy; no placeholder-only labels. |
| Small audience choice | Canonical picker-field anatomy; existing audience model | Preserve real household/people/follower selection, not a generic picker that loses recipient review. |
| Feed/refresh | `CanvasFlatList` layout helper; canonical `KwiltRefreshFrame` | One vertical list; refresh overlay never participates in spacing. |
| Avatar | Existing `ProfileAvatar` is scoped reuse unless inventory grants broader status | Authorized source/fallback only; no automatic promotion. |
| Overflow/confirmation | Current DropdownMenu and AlertDialog are Promote, not Canonical | Reuse only with scoped anatomy and runtime proof; no self-promotion. |
| Editor primary action | Canonical FullWidthActionDock + Button | One page action region, frame-owned clearance/keyboard behavior. |
| Conversation reply region | Canonical resting-composer geometry as precedent | Home owns public-to-post-audience semantics; never copy AI-chat behavior. |

Nearest accepted pattern for persistent actions is Canonical Bottom Dock Geometry in the [pattern atlas](../design-system/pattern-atlas.md). The mixed social feed itself remains a new Home-local composition requiring visual acceptance. The atlas does not make it canonical merely because its controls are canonical.

### Three-screen UI contract

| Surface | Three-second read and scan order | Primary action / quieter information |
|---|---|---|
| Home | My people → a person's moment → ways to respond | Create is the single filled header action. Per-post Cheer/Comment/Save and source actions stay quiet. Show household/source state without making every card a priority CTA. |
| Conversation | Original moment and audience → replies → my response | One Send action, enabled only for a valid reply. No private-DM implication, duplicate send or always-visible destructive actions. |
| Editor | My selected moment → caption and audience → Post | One Post action. Audience selector remains visible; reorder, remove, description editing and discard are secondary. Draft saved is quiet status, not an action. |

### Design acceptance gates

- **Neutral action audit:** Create, Send, Post, Review, Save to Explore, active reactions, selected thumbnails/people states and Draft saved match DS-01. No ordinary green interaction/status styles remain in this version.
- **Spacing audit:** inspect photo→chore, chore→text, text→goal, expanded-caption and absent-preview boundaries. Every adjacent pair uses one 32-point separator; contents use the specified smaller gaps. First/last items have correct header/footer clearance.
- **Composition audit:** verify at narrow phone width and iPhone 17 Pro, default and accessibility text sizes, light/dark only where the app actually supports the appearance. Do not add a new app theme as part of Home.
- **Native interaction audit:** open through the real main-menu route; exercise viewer, reply keyboard, audience picker, source return, saved library, pending publication, failed image and access loss. Verify iOS first and label Android/assistive proof separately where supported.
- **Evidence:** save populated native screenshots and a short navigation/keyboard recording with checkout, branch, commit/dirty state and build provenance. The image board and this source-based design pass do not satisfy native visual acceptance.

Design-system pass outcome at PRD stage: **authority, components, color decisions and spacing are specified; rendered composition and runtime behavior remain unverified until implementation.**

## Context

The first Instagram-inspired mockup improved content hierarchy. Andrew then requested a design loop on all eight proposed refinements. This brief defines their ready concepts; it supplements the accepted shared-life foundation. No implementation, deployment, or user-validation claim is implied by concept readiness.

## Target audience

Aspirational family organizers are primary; chosen private supporters are secondary. Both need people and moments to feel recognizable without administering visibility or participation on every visit.

## Representative persona

Maya wants to catch up, acknowledge a contribution, share a photo and resume her day. David may join only a specific support context and expects it to remain bounded.

## Aspirational design challenge

How might Home make Maya feel included in everyday life and make sharing, appreciation and participation natural, while preserving clear audiences and trustworthy source behavior?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the existing Maya/Home alignment. Ordinary connection remains first-class even where the taxonomy only partially describes it.

## Job flow step

[Maya's family-life flow](../job-flows/maya-move-family-life-forward.md), steps 7 and 8, currently documented at 3/5: participation without admin and helpful continued use. Recent Home implementation is ahead of parts of that historical document. Scores remain unchanged until released experience supplies evidence.

## JTBD framing

When I check in, help me understand what my people have shared, respond in my own voice, and contribute something of my own. Chosen participation serves `jtbd-invite-the-right-people-in`; useful shared activities serve `jtbd-help-us-enjoy-being-together`; reliable context, drafts and explicit visibility serve `jtbd-trust-this-app-with-my-life`.

## Design

The eight concepts below are one interaction system. Their [three alternatives each](../design-explorations/kwilt-home-ready-concepts/02-diverge.md) and [selection rationale](../design-explorations/kwilt-home-ready-concepts/03-converge.md) are part of this brief. Exact copy below is proposed UI copy. Example people/content are fictional.

### C1 — Your people, caught up

**Purpose / challenge:** help Maya find what is new from someone she cares about and reach a satisfying stopping point. Catalog 12–15, 39. Extend the existing connections/history projection with private seen state.

**Chosen experience:** a single horizontal rail below Home's header, within the scrolling header rather than permanently pinned. It shows people or households with authorized unseen authored moments, ordered by newest unseen moment. Each entry has avatar/name and “2 new”; color is supplementary. At most 12 entries appear, followed by “All people.” The latter opens the People destination with all eligible connections, relationship state and authorized histories. No unseen moments means no catch-up rail; People stays available in the Home menu. No connections means a small contextual “Find your people” action alongside direct sharing, not an empty ring shelf.

Tap Alex → a person catch-up screen showing Alex's unseen authored posts oldest first, preserving original post controls and audience labels. Freeze the entry set at opening, reconcile removals, then show “You're caught up with Alex” and “See all moments.” New arrivals wait for the next refresh. Back returns to the same Home location. A household entry follows the same rules for that household's authorized authored moments; contributions stay in Home and household history but do not inflate catch-up counts.

**State / authority:** the same post may qualify under a person and household entry; seen status is by viewer/post, so reading once updates both. Never add bubble counts into an inflated global total. Count only currently accessible posts. Mark seen after one continuous second with at least half of the smaller of post height and usable viewport height visible; foreground only. This rule is a proposed usability heuristic, not a measure of comprehension. Failed writes retry idempotently and may conservatively show content as new; authors never receive read receipts. Revocation removes items immediately. No child personal history is inferred from chore actor identity.

**Data / ownership:** new authorized catch-up summary, stable person/household keys, cursor-paged histories and private per-post seen records. Initial release has no automatic expiry, autoplay or ephemeral-story promise. Avatar fallback uses existing names; real profile photos require an authorized endpoint.

**Acceptance:** a post eligible for two bubbles clears both after reading; offscreen prefetch does not mark seen; later pages do not hide new head posts; account change clears the rail; a removed connection yields no names/counts from inaccessible content. A user can reach a person, finish, and return without losing position.

### C2 — A conversation already in motion

**Purpose / challenge:** show that real people have responded and provide a natural opening. Catalog 22–26. Fit the existing single conversation per post; extend its authorized summary.

**Chosen experience:** each moment has an action row, optional appreciation line, caption/source body and at most one inline reply preview. “Maya and Ben cheered” shows up to two authorized names; larger groups use “Maya and 3 others.” Tap the line to view who reacted. Never show an empty “0 cheers” line. Actions remain available even with no responses.

Choose the latest visible non-deleted reply chronologically, with a deterministic ID tie-break; no popularity ranking or AI selection. Render author and up to two lines, then “View all 4 comments.” One reply uses “Reply”; no replies uses “Comment.” Preview tap opens the existing thread in the canonical conversation drawer, with rounded original-moment thumbnail/title and the canonical `ChatComposer` above the keyboard. A thread with zero to two replies opens at the 62% reading detent; three or more replies or focusing the composer uses the full detent. The composer follows Unified Chat's compact-pill-to-focused-two-row expansion, grows with measured text, and includes speech-to-text with visible recording, transcription, cancellation, error, and retry states. The transcript enters the draft at the captured selection; it never posts automatically. Home omits AI context and attachment tools it does not implement. Dragging down from full returns to the reading detent before dismissal. All replies remain in that one thread. The feed preview is not a new message channel.

**State / authority:** comments are visible to people who can currently view the post, subject to existing safety restrictions. The drawer does not repeat a visible thread-membership helper; the reply input retains “Visible to this post's audience” as its accessibility hint. Deleted/reported/unavailable material follows authoritative visibility and never lingers from a cached preview. Missing summaries omit the preview, not the whole post. Reaction taps update locally and reconcile per post; failures offer a local retry. No global feed lock and no automatically sent reply.

**Data / ownership:** post projection adds a bounded reaction-name summary and one authorized reply preview with counts from the same visibility scope. Do not expose a user directory or fetch every thread to render a page. Stable reply ID supports exact navigation and removal.

**Acceptance:** deleted preview is removed; hidden responders do not appear in names/counts; rapid toggle returns the correct reaction state; replies preserve typed text after network failure; voice access exposes selected reaction state and preview author. Appreciation is voluntary, not a quota or household ranking.

### C3 — Every kind of moment belongs

**Purpose / challenge:** make photos, words and source moments equally welcome while maintaining a learnable structure. Catalog 1–7, 16–21, 35. Fit current post types through a shared shell and a small body registry.

**Chosen grammar:** author/avatar → audience/time → content body → responses and supporting context. Authored photo posts use a generous gallery followed by caption. Text-only posts place the story in the content body, at normal readable body type, with optional More after six lines; photo captions preview three lines. Avoid ornamental quote marks that imply someone else said the words. Expanded text stays expanded while navigating within the visit.

Photo body uses the existing four-photo limit, horizontal paging, position “2 of 4,” and accessible next/previous. Preserve the selected first photo's aspect ratio within a feed height between 0.65 and 1.25 times content width; fit later photos within that stable frame using a neutral background. Full-screen view always offers the complete image. Optional dimension metadata supports stable layout; older assets fall back safely.

Completed-goal body shows “Goal completed,” the shared title and the author's own reflection, with restrained celebratory color. If the author added photos, lead with them and put the milestone context beneath. A place/photo uses the same gallery plus C4. Chores use C5. No invented progress percentage, effort total or AI-written reflection.

**State / authority:** a failed photo has a reserved frame with Retry and its description. Other photos/text remain usable. Empty text is valid with supported media or source content. Unknown future attachment types fall back to a readable generic shared-moment body without guessing an action. Media view closes safely on access loss.

**Data / ownership:** shared header/actions are reused; content-specific body owns presentation only. Optional dimensions and durable gallery indices are UI/media extensions; source facts remain owned elsewhere.

**Acceptance:** fixture set includes text-only, long text, four mixed-aspect photos, photo+goal, place, unknown attachment and pending chore. A user can identify what happened and who can see it. Large text expands layout without truncating key controls; no gesture is the only way to use the gallery.

### C4 — A moment with a useful next step

**Purpose / challenge:** help Maya act on a discovery or invitation without confusing a shared snapshot with full source access. Catalog 28, 33 and the concrete invitation refinement. Fit existing source ownership; extend action availability where needed.

**Chosen experience:** one compact preview below the relevant authored content. Place: a small map thumbnail from the explicitly shared coordinates, place name, and “Save to Explore.” Saved state becomes “Saved to Explore” with “View in Explore.” Map failure leaves name and save intact. A post bookmark means save the moment; the explicit Explore verb names a different action.

Goal: completed title and shared reflection are readable as the published snapshot. Offer “Open goal” only when the current viewer has actual source access and a usable route. Current snapshot-only attachments do not automatically have that route; until an authorized source reference is added, omit the action. Do not leak private Goal notes, targets or membership through a preview.

**Needs you:** retain a separate source-backed action group near the header. One item shows its actual person, source object and verb, for example “Alex invited you to support ‘Garden’” → “Review invitation.” Several show one concrete item plus “View all 3”; selecting that opens the full actionable list. Source-specific supported verbs include Review invitation, Choose a meal and Take your turn. Render only capabilities/events actually provided by the delivery system. A generic future picnic invitation is not part of this concept.

**State / authority:** opening revalidates source availability. Handled/expired/revoked actions stop looking actionable; errors preserve a clear return path. Reviewing a private invitation does not publish it. A completed source action does not create a second Home post unless an existing explicit offer or the Chores exception applies.

**Data / ownership:** source supplies action identity, label, current availability and route. Home supplies presentation and return anchor. Shared coordinates are an explicit snapshot, never live location or the complete route history. A saved Explore place is an intentional copy of those disclosed coordinates; withdrawing the post does not falsely promise erasure of that separate saved place.

**Acceptance:** recipient without Goal access can read only the shared snapshot; source revocation disables its action; source unavailable does not strand navigation; duplicate save is idempotent; invitation copy matches the actual event and count. No unsupported action is rendered as a working button.

### C5 — Contributions worth noticing

**Purpose / challenge:** recognize care without making Home a chore scoreboard. Catalog 1, 23, 35. Fit the existing server-owned household chore projection and grouping rules.

**Chosen experience:** compact avatar/initials, “Sam finished 2 chores,” household/time, up to two titles, “Details” for longer or mixed-state groups, then Thanks and Comment. Use a permitted membership avatar if available; otherwise existing initials. Actor identity is household context, not a personal post author link.

Pending-only: “Sam marked 2 chores done” with “Waiting for approval.” Mixed: “Sam completed 1 chore · 1 awaiting approval.” Approved: “Sam finished 2 chores.” Exact occurrence states govern wording; neither the headline nor Thanks implies approval. A household member can say Thanks while approval is pending. Approval remains in Chores through its authorized detail route, not in the social action row.

Details expose each source item, approval state and truthful earlier-reporting context. Keep current server bundling rather than client regroups: the present implementation uses its existing time/item limits. Do not regroup by engagement or silently combine different people. Reactions stay attached to the same surviving bundle as item state changes.

**State / authority:** no share prompt, no author caption edit, household-only visibility. Undo removes the occurrence from the group; an empty group becomes unavailable and its thread cannot expose withdrawn titles. Existing server lifecycle owns surviving replies/reactions. Report remains available through the correct source subject. A Moments-only view can omit system contributions without removing them from default Home or other viewers.

**Data / ownership:** current chore-update payload plus safe actor avatar and optional C2 response summary. No new household performance aggregate or ranking.

**Acceptance:** pending, mixed, approved, earlier-reporting, undo-one and undo-last scenarios stay truthful; followed households do not expose internal chore updates; null author never opens a fabricated person profile; acknowledgment is separate from approval.

### C6 — Save the moment, find it again

**Purpose / challenge:** give meaningful posts a dependable return path and allow personal organization without setup. Catalog 10, 27, 40. Extend saved places into a private post library.

**Chosen experience:** post bookmark saves immediately to “Saved,” with a small confirmation “Saved · Organize.” Organize opens optional collections; no collection choice is required to save. Home's menu explicitly exposes People and Saved alongside feed-view choices. Saved opens All saved, Places and Collections; Places here includes bookmarked posts with place attachments, while “Saved places in Explore” links to the existing Explore library and its independent saved-place records.

Collections are private to the current account, user-named, manually created and ordered by latest save. A post may belong to multiple collections. Remove from a collection keeps the main save; Unsave removes the bookmark and all collection memberships. Delete collection removes its grouping only. Explain that scope in the destructive-action confirmation. Search matches the user's collection names and currently authorized saved-post captions/place titles; no broad private-content index is exposed.

**State / authority:** saved is not shared, the author receives no notification, and it grants no new post access. A withdrawn/revoked post is omitted with no retained name/photo/caption; the library may show a generic “Some saved moments are no longer available.” Account change clears local previews. An already imported Explore place is a separate explicit copy, as defined in C4.

**Data / ownership:** viewer/post save relation, viewer-owned collections and membership relation; all reads intersect current post authorization. Unsaving/collection edits are idempotent. No shared collection audience, reshare, archive copy, or AI retrospective is added in this release.

**Acceptance:** user saves without setup, refinds in Saved, organizes later, deletes a collection without deleting posts, distinguishes post save from Explore save, and cannot recover a revoked photo through collections. Empty Saved explains bookmarking with one concrete action back to Home.

### C7 — One editor, ready for the moment

**Purpose / challenge:** meet the intention that started sharing and survive interruptions while keeping audience choice explicit. Catalog 30–34. Fit the existing draft identity, pipeline and immediate celebration handoff.

**Chosen experience:** Home Create opens one editor directly, with caption/body and Add photos together. Photo-first capability intents can still launch library selection. Selected photos appear once in a compact strip; Edit photos reveals ordering, removal, and optional screen-reader descriptions. Missing descriptions do not block posting; publication supplies a neutral numbered photo label. Capability Share enters with the exact approved attachment already visible. User can reorder/remove photos, edit alt descriptions and caption, remove an attachment, and choose audience without changing source content.

Header: Close, “Share a moment,” and one compact Post action; its accessibility label includes the selected audience. The always-visible audience chip opens a picker for the existing three audience modes. Post stays in the header, outside the writing area. The editor owns keyboard insets and focused-input scrolling; there is no floating bottom submit dock. Errors and publishing status occupy their own row below the header. For first use, preselect the sole eligible household if one exists; otherwise require an audience choice. Existing draft/offer audience wins over inferred defaults. Never derive it from the current feed filter.

Close while editing saves the local draft and confirms “Draft saved”; Discard lives in the editor's overflow with confirmation. A prior draft is offered for resume without discarding an incoming source offer; preserve the existing queued handoff contract. Photos must be copied to durable account-scoped draft storage rather than rely on a picker temporary URI.

**Publication lifecycle:** editing → uploading → publishing → published. Failed upload retains the same draft ID and offers Retry. Close during upload offers “Keep open” or “Stop upload and save draft”; stop cancels work before the publish step and waits for cancellation acknowledgement. Once publication has been sent, Close saves context and returns to Home with an account-owned “Publishing…” indicator; the request result/reconciliation owns completion. An uncertain result shows “Checking your post…” and queries by the same ID before retrying. Do not offer guaranteed cancellation after the server may have committed. Published confirmation clears the draft only after authoritative success and offers “View post” without unexpectedly changing the reader's filter or position.

**Source exception:** personal Goal/Explore action succeeds before a shared celebration with Share/Continue. Continue never undoes success. Automatic Chores uses C5 and never enters this editor by default.

**Acceptance:** one/four photos and writing-only; denied photo permission; interrupted draft; stale audience membership; incoming offer with prior draft; cancel during upload; uncertain publish result; duplicate tap; account switch. None loses captured content to a recoverable failure or duplicates/widens a post. A readable audience is present at final submission.

### C8 — Explore and come back exactly where you were

**Purpose / challenge:** make every interaction feel responsive and every return dependable. Catalog 18, 20–21, 24, 34, 36–38. Extend local state while preserving authoritative server decisions.

**Chosen experience:** Home stores view key, first visible post ID plus pixel offset, expanded captions, and gallery indices per signed-in account for the current visit. Media viewer, conversation, person history, Saved and source routes carry a return target. Back restores the anchor. If the anchor was deleted, restore the nearest surviving chronological neighbor; never resurrect it. Switching account discards protected view state.

Maintain separate head fetch, existing-item reconciliation and older-page cursor. New head items while browsing appear behind “New moments”; activating intentionally brings them into view. Pull refresh at the top also refreshes. Reactions update locally per post; request sequence prevents late responses from overwriting newer intent. Stable placeholders reserve image geometry. Existing account/generation guards remain mandatory.

**Failure model:** initial loading shows a content-shaped placeholder without fake people/content; empty means a successful authorized empty result; transient refresh error preserves only still-valid content with Retry; authorization loss clears content. Never interpret a timeout as an empty feed or unauthorized success. Pending changes are visibly pending, not confirmed. Foreground refresh reconciles access before restoring protected media after backgrounding.

**Accessibility/motion:** actions have 44-point targets, names and selected state; carousel and viewer have explicit controls; keyboard doesn't cover reply/Post; VoiceOver focus returns to the initiating element or nearest safe successor. Reduced motion removes expansion/transition movement while preserving state feedback. Validate contrast and Dynamic Type rather than trusting an image mockup.

**Data / ownership:** one virtualized vertical list and route-return contract, account-scoped transient state, ordered per-post pending operations, authorized reconciliation. Do not add an offline “always readable” cache that defeats revocation. Durable drafts belong to C7, not scroll state.

**Acceptance:** 100-item mixed feed; new post while reading older pages; deleted anchor; reply then close the conversation drawer; photo index then Back; source action then Back; offline toggle; stale response; account switch and access removal. Correct position and authority take precedence over animation polish.

## Integration rules and build order

C8 underpins every concept. C3 supplies the shared presentation for C2, C4, C5 and C7. C2 summaries and C1 catch-up use the same current post visibility. C6 uses it again for saved content. No feature keeps an independent copy of a protected post to evade those checks.

First coherent release: C3+C4+C5+C8 plus C2's contextual conversation and C7. Next: C1 and C2's richer authorized summaries, then C6. This is dependency ordering, not removal of any concept. Private collections are part of C6's ready concept, rather than an unspecified future optional feature.

The existing [implementation plan](../superpowers/plans/2026-09-09-kwilt-home-instagram-ux.md) provides file-level starting points; this brief controls refined product behavior if it conflicts. In particular: one Post action, explicit stop-versus-uncertain-publish behavior, private collections, and finite authored-moment catch-up supersede earlier open choices.

## Success signal

Maya can catch up, respond, understand a contribution, share to the intended people, and refind a moment with no tutorial, lost context or privacy misunderstanding. See [evaluation](../design-explorations/kwilt-home-ready-concepts/05-evaluate-learning.md) for individual concept bets and disconfirming signals. Session length and response volume alone are not success measures.

## Spec refinement

All eight have interaction, activation, state, data authority and acceptance definitions. Chosen defaults to review in the next prototype: latest-reply preview, private collections, authored-only catch-up counts, 12-entry rail cap, three/six-line caption expansion, and one-second seen heuristic. These are explicit design assumptions; they are adjustable without changing the core product contract.

Technical prerequisites to verify before implementation: source action routing/reference support, membership/avatar authorization, private media cache invalidation, cancellation support, cursor/seen projection efficiency, and app navigation return ownership. Where prerequisites are absent, implement the specified extension with tests; do not ship a nonfunctional icon or substitute broader access.

Not decided by this brief: video duration/storage policy, ephemeral Stories, shared collection audiences, public reposting, child Home access, AI journal publishing, or new event invitations. They belong to separate concepts already identified in the broader roadmap.

## Open questions

No unresolved product decision blocks building a prototype of these eight concepts under the stated defaults. The next review should test the full populated composition on a small phone: does the rail plus a real invitation still leave the first moment prominent, and does one reply preview feel welcoming? Those are learning questions, not claims of validated design.

## Purpose-led feed revision — September 9, 2026

Andrew accepted the working jobs catch up, be seen, recognize, respond, participate, and remember. This composition revision serves those jobs without removing posting, contextual offers, approved connections, durable history, Saved/collections or capability participation.

Moment makes everyday life understandable and invites conversation. Contribution makes effort visible and invites thanks. Personal message foregrounds support and retains source continuation. Invitation/request foregrounds purpose and one truthful next action. Feed items share controls and tokens rather than identical surface styling.

This supersedes the earlier per-post action-row and uniform soft-card anatomy: attribution/audience and compact icon responses share one supporting region; Save and responder detail are in overflow; empty social groups are absent. Source labels are omitted when redundant. Existing preview, source ownership, privacy, moderation and unavailable/settled behavior remain binding.

### Action-first footer refinement (candidate, September 9)

All four feed patterns use content → one action row → metadata → optional real reply preview. The action row groups Cheer/Comment, Thanks/Comment, or the source participation action with overflow at the trailing edge. Identity, audience, and time sit below without toolbar controls. Place utilities and saved-moment management live in overflow. Settled source items retain their outcome in the card and omit unavailable participation actions. Preserve the tokenized gray100 canvas, borderless white cards, and 44-point icon targets. Content expansion remains an inline disclosure.

## 2026-09-10 amendment: standard sharing drawer and recent moments

This user-requested amendment supersedes the earlier full-screen editor and header Post placement. Use the canonical task drawer (`BottomDrawer`, `BottomDrawerHeader` with close, `BottomDrawerScrollView`, semantic `footer`, keyboard `resize`) for Share a moment. Post is the single trailing footer action. The drawer owns keyboard, safe-area, handle, and footer separation. No local modal chrome.

The conversation is also a canonical `BottomDrawer`, not a full-screen `SharedLifePage`. It uses controlled 62% and 100% detents, opens short threads at 62%, opens active threads with three or more replies at 100%, and expands to 100% when the reply composer is pressed or focused. Its fixed `bottomAccessory` owns the reply composer, footer separation, keyboard resize, and bottom safe area. Post editing remains a separate full-page task.

An empty generic opening shows up to three real recent moment choices before asking for writing. The keyboard opens only after an intentional writing action. Offer more in batches of three, capped at twelve; reset the preview on reopening the picker. Explore choices use current-person relationships and named valid Places. Completed Goals are selected by status and recent update; never present update time as a completion timestamp. Meals use owner-authorized completed Cook records and available recipe titles. Selecting a meal prepares editable ordinary text ("Made …"), not a new feed component or a copy of the private recipe/journal. Use a thirty-day window, newest entity occurrence, and type diversity in the first three.

Keep existing words/photos/audience on selection; changing attachment is explicit. Restore authored drafts and capture-time offers straight into review. A selected Place discloses that its name and exact location will be shared, with route private. No automated publication or inferred story. Source failure leaves other choices and writing available; late responses cannot cross accounts or Household mode.

Spec refinement: no schema migration; no new attachment enum. Goal completion-date precision remains a model limitation. Recipe title is the currently accessible title, with no claim it is a historical snapshot. Full recipe sharing and comprehensive capability browsing remain separate work. Design and acceptance plan: [Home moment picker](../design-explorations/home-moment-picker/03-converge.md).
