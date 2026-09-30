# Kwilt UI Pattern Atlas

The atlas governs how Canonical primitives compose into coherent Kwilt surfaces. A component story proves a component; an atlas entry proves hierarchy, relationships, and use in context.

## Maturity

| Status | Meaning |
| --- | --- |
| Canonical | Default composition for the documented job. |
| Candidate | Useful precedent that still needs rendered review or state coverage. |
| Local | Capability-owned composition; do not generalize it. |
| Missing | No approved pattern yet; design and review before feature implementation. |

Bottom Dock Geometry is the first Canonical reusable composition. Andrew approved its promotion on 2026-08-17 after repeated phone-shell review and accepted Conversation Mode comparison. Other Candidate entries still require surface-specific visual acceptance.

## Canonical Patterns

### Message and Reply Composer

Job: When someone writes a chat message or replies to a shared moment, they need one familiar writing control that stays compact for a short response and gives longer writing enough room without changing submission semantics.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-09-11.

Anatomy: `ChatComposer` owns one filled composer surface. It is a compact pill at rest, then becomes the same rounded two-row composition as Unified Chat when focused or populated: prompt above, tool/action row below. The prompt measures and grows in place to the Chat viewport cap. Dictation and Send use 40-point targets with 34-point internal visuals; recording replaces the prompt with elapsed time and live levels, while connecting/transcribing stay visible and cancellable and a retained failure may be retried. The host supplies the accessible input/action names and owns draft state, validation, submission, dictation execution, retry, persistence, and its keyboard/layout frame.

Approved routes: Unified Chat is the cross-client reference; Home conversation replies use the native component with speech-to-text. Home omits Unified Chat's AI context and attachment actions because that host does not implement them. A capability-owned post/publish editor with attachments and audience review remains a distinct composition.

States: Empty resting pill, focused expansion, populated expansion, multiline growth, disabled, loading, and send-ready. Blurring an empty composer returns it to the resting pill; entered text keeps the writing surface expanded.

Do not use when: The task is a labeled form field, search, inline title, rich note, or a post/publish composition with capability-owned tools. Do not add a second visible privacy/helper line when the host context already explains the audience; retain necessary context in the accessible hint.

Implementation: `src/ui/ChatComposer.tsx`.

Last reviewed: 2026-09-11.

### Short List with Incremental Reveal

Job: Scan the most relevant recent items quickly, then reveal older items only when needed.

Status: Canonical behavior for transient navigation lists. Andrew explicitly requested this pattern on 2026-09-09. Other surfaces still need their own composition and runtime acceptance.

Contract: Start with a small preview. Place a quiet “View more” action directly after the visible rows. Each tap appends one bounded batch in the existing order without replacing the list or moving its scroll position. Hide the action once all items are visible. Closing the containing menu resets the preview and scroll position; the next opening starts compact. Do not persist the reveal count or substitute an unbounded “View all” expansion.

Chat application: Show three recent chats initially; each tap reveals up to ten additional chats (3 → 13 → 23…). Menu close restores three. Existing explicit bulk-selection mode remains a separate management state and also ends on menu close.

Anatomy: Existing menu rows plus a secondary text disclosure action, localized through Kwilt tokens and accessible button semantics. The accessible hint states how many items the next tap reveals. No new card, confirmation, count badge, or collapse action is required.

Reference: User-supplied Codex sidebar “Show more” screenshot, 2026-09-09. Preserve the quiet trailing action and short initial list; translate copy to “View more” and use Kwilt components; reject copying desktop chrome, pixel dimensions, or treating the screenshot as authority for batch size or reset behavior. Those behaviors come from Andrew's explicit instruction.

Implementation: `src/navigation/CapabilityMenu.tsx`; open/close state supplied by `src/navigation/RootNavigator.tsx`. Regression coverage: `src/navigation/CapabilityMenu.test.tsx` for repeated batches, exhausted lists, chat selection, and close/reopen reset.

Last reviewed: 2026-09-09.

### Secondary Settings Page

Job: When a person opens a pushed management page within a top-level capability or Settings, they need to stay oriented while scanning related controls as one familiar system.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-27.

Approved routes: Pushed second-level management pages, including Screen Time inventory and rule detail, Money category detail, and equivalent Settings destinations. Top-level capability landing pages are excluded.

Rendered references: Screen Time inventory and Shopping category-detail Simulator references reviewed 2026-08-27. The Screen Time reference establishes the correction target; Shopping establishes the accepted compact-header and gray-canvas precedent.

Three-second read: A compact centered destination title, a back path, and grouped white management cards on the gray application shell.

Scan order: Destination title -> current access or object state -> tightly labeled management groups -> rows and disclosure destinations -> optional completion action.

Primary action: The one capability-owned management action for the current level, such as Add rule or Save changes. A list row opens its detail; it does not skip directly into one field editor.

Anatomy: `SettingsPage` owns the gray `shellAlt` canvas, compact centered title under the safe area, 44pt back target, scrolling content, and standard group spacing. `SettingsGroup` owns a label immediately above one white rounded card and may carry one quiet header action. Rows use one consistent list anatomy: title, supporting outcome/context where needed, current state, and disclosure when the row opens detail.

Canonical components: `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsDetailRow`, `SettingsToggleRow`, and `SettingsDivider` in `src/ui/SettingsSurface.tsx`.

States: Loading, empty, populated, disabled/unavailable, enabled, and pressed. Empty collections remain inside the same white group surface. Enabled state belongs in rule detail unless a list is explicitly designed as a direct-control list; one list must not mix direct toggles and disclosure rows for equivalent objects.

Responsive and accessibility behavior: The centered title remains centered independent of back-button width. Back and header actions retain 44pt targets. Detail rows expose title, concrete behavior, owner/context, and On/Off state in one spoken label. Supporting copy wraps under Dynamic Type rather than truncating the rule's meaning.

Allowed variations: A group may omit its label, include a quiet footer, or expose one trailing header action. Capability-owned condition editors may use drawers or deeper pages, but return to the same rule-detail grammar.

Do not use when: The page is a top-level capability landing page, an initial immersive onboarding step, a focused emotional moment, or a platform-owned picker. Do not use a large leading `PageHeader` on a pushed secondary page; do not use a white page canvas; do not place section labels far from their cards; and do not make an object row jump directly into an arbitrary field editor.

RNR reference: Localized Kwilt Settings components remain authoritative for control anatomy and tokens.

External-exemplar preserve/translate/reject ledger: Preserve the clarity of native grouped settings and compact navigation titles; translate them through Kwilt typography, gray shell, white cards, and capability language; reject copied platform chrome, inset-table pixel matching, and mixed row behaviors.

Kwilt localization: Capability owners define rule conditions and outcome copy. The shell, hierarchy, row grammar, and transition from inventory to full detail remain shared.

Last reviewed: 2026-08-27.

### Onboarding path invitation — adopted design, native proof pending

Andrew approved implementation on 2026-09-28 after the local landing-pattern trial. Applies immediately after the household landing promise, before a capability is selected. Job: invite one starting path without adding another statement/Continue gate. Preserve the anchored introduction and center the compact choice group in the remaining scrollable area above reserved dock clearance. White canvas (`colors.card`) is a scoped exception to parchment, not an app-wide canvas change. Use a medium heading, existing support copy, neutral underlined Skip and four icon-led `ChoicePill` controls with regular sentences and semibold key phrases. No chevrons or extra Continue button. Paths keep their existing capability introductions and handoffs.

Reveal the introduction as one group, then all choices together (200/700ms start delays, 950ms fade with 8pt float); no per-choice ranking or stagger. Return visits, Reduced Motion and screen-reader use omit the choice reveal. Choices wrap and the page scrolls at larger text sizes. Skip remains a button action with an underline, not an external URL. Excludes primary submission buttons, questionnaires with persistent selected state, illustrated capability pages and routine app use. Source: Origin first-run capture 19's invitation/pill composition; reject faded choices and the composer. Implementation owner: HouseholdStarterFlow + ChoicePill. Design direction adopted; native rendering, text scaling and assistive-technology review remain pending. No new global link or button variant is adopted.

#### Continuity into capability invitations — owner-directed mock refinement

Money invitation presentation approved 2026-09-28: shared anchored heading “Your money, in one place.”; no subtitle; a centered middle-region Kwilt–Plaid connection cue with one provider explanation; existing bottom Connect an account action. No sign-up-sequence footnote, fabricated data or connection-success indicator. Current mock uses a plain-text Plaid label, not official partner artwork. Approval is design acceptance, not native/runtime or backend proof. The subsequent account invitation remains a separate trial.

2026-09-28: the white path-choice page and subsequent white capability invitation share an anchored introduction: same top offset below navigation, horizontal gutters, left alignment, heading weight/scale and heading-to-support spacing. The middle region varies by job (choices, illustration, or no visual); removing content must not vertically center the introduction. A capability action uses the existing bottom dock, independent of content height. Headings may wrap naturally and supporting text follows; at larger text sizes allow scrolling rather than clipping or shrinking text. Retain quiet grouped reveals without changing resting positions.

Applies to the current post-landing onboarding invitation trial, not the atmospheric first-launch promise, provider-owned Plaid screens, forms, evidence/results pages or routine app use. Do: leave the content region open on a copy-only invitation. Don't: center its headline because artwork was removed. Mock owner: `landing-pattern-trial.html`, shared `.choices` introduction layout inherited by the Money stage. Design direction requested by Andrew; native extraction and fresh rendered acceptance remain pending. This extends composition scope only, not authentication or connection behavior.

### Bottom Dock Geometry

Household onboarding refinement (2026-09-26): its full-width actions explicitly use `FullWidthActionDock placement="restingFloatingControl"` and matching hook clearance for the requested 32pt side/bottom corner nesting. Other full-width page actions retain their existing default geometry.

Job: When the current action must remain available at the bottom of a phone surface, the user needs it to feel deliberately nested inside the device rather than attached with arbitrary padding, so it remains reachable without colliding with the home indicator, keyboard, tab bar, or content.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-17; resting floating-control refinement approved 2026-08-25.

Approved routes: `ActionDock` and `SplitActionDock` phone-floating controls; `FullWidthActionDock` for one persistent full-width page button; `BottomDrawer.footer` for bounded completion; `BottomDrawer.actionDock` with `DrawerDestinationAction` for a persistent next destination; Unified Chat Conversation Mode composer states.

Rendered references: `artifacts/conversation-mode/listening-nested-improved.png`; `artifacts/bottom-dock/activity-schedule-full-width-action.png`; To-dos inventory resting dock; Activity Detail next-action dock; accepted iPhone 17 Pro web composer proof with approximately 21px visible side and 22px visible bottom gaps; iPhone 17 Pro native drawer proof with a 24pt visible inline gap and full home-indicator clearance.

Three-second read: One current action is visibly anchored to the surface and balanced within the phone's lower corner geometry.

Scan order: Current decision context -> one bottom action region -> surrounding safe space.

Primary action: The capability-owned current action. Geometry never invents, duplicates, or changes the action.

Anatomy: Capability-owned content inside either a resting floating-control frame, a full-width phone-floating frame, a semantic drawer footer, or a drawer action-dock frame. The frame owns inline gap, bottom gap, safe-area policy, keyboard relationship, and content clearance. A drawer footer keeps its optional secondary action before the primary in one intrinsic, trailing horizontal group; it does not stretch the actions into equal columns. It is an attached, edge-to-edge surface with an always-on, subtle upward elevation and separately inset action content, not a floating dock. A single drawer destination floats over the workspace and uses the standard centered leading-icon-and-label button anatomy. Resting floating controls use the To-dos inventory's 32pt inline and 32pt compact-bottom corner nesting. Detail action docks keep the recommended split action intrinsically sized, preserve deliberate open space, and isolate completion or contextual status on the opposite edge. Inventory docks may let their capture or search surface fill the remaining row before fixed circular utilities.

Canonical components: `ActionDock`, `SplitActionDock`, `FullWidthActionDock`, `BottomDrawer.footer`, `BottomDrawer.actionDock`, `BottomDrawerSemanticFooter`, and `DrawerDestinationAction`. `bottomAccessory` remains a low-level compatibility seam. Geometry tokens live in `@kwilt/tokens/bottomDock`: `restingFloatingControl` governs inventory and detail floating controls, while `phoneFloating` retains the narrower full-width page-action geometry.

States: Resting, pressed, disabled, loading, keyboard open, no home indicator, home indicator present, and capability-owned state transitions such as Conversation Mode listening/thinking/speaking/recovering. State changes replace content without moving the outer frame.

Responsive and accessibility behavior: Resting inventory and detail controls use 32pt inline and compact-bottom gaps. Full-width phone-floating page actions use a 24pt inline optical gap and target at least a 20pt bottom gap, with a partial safe-area lift where needed. Semantic drawer footers use a 24pt inline gap and the full bottom safe-area inset. Drawer destination docks float with 32pt inline and bottom corner nesting; their standard full-width destination button is 44pt high, and scroll content reserves the component-provided clearance rather than feature-owned numbers. All use 12pt content separation. Controls retain 44pt minimum targets, Dynamic Type support, and Reduce Motion behavior. Keyboard and tab-bar collision checks are mandatory.

Allowed variations: Floating versus drawer-contained anatomy; intrinsic detail action versus flexible inventory action versus one full-width page action; quiet top divider when scroll content needs separation; platform safe-area expansion. A persistent full-width page button uses `FullWidthActionDock` rather than screen-owned bottom padding. Intrinsic detail actions do not expand merely to occupy the row. Visual materials and action semantics remain component-owned.

Do not use when: The action is not persistent, the drawer action naturally belongs in scrolling content, a platform-native bar owns the placement, or persistence would duplicate a nearby primary action. Do not pass numeric placement overrides from feature code.

RNR reference: Localized Kwilt `Button` anatomy remains authoritative for the control. No upstream layout primitive supersedes this phone-shell contract.

External-exemplar preserve/translate/reject ledger: Preserve the calm corner balance of accepted mobile precedents; translate it through Kwilt tokens and safe-area behavior; reject traced device pixels, copied control anatomy, and per-screen spacing guesses.

Kwilt localization: This is an optical contract, not a demand that every bottom action look alike. Conversation Live Dock, action docks, and full-width drawer buttons share placement while retaining their own semantics and state presentation.

Last reviewed: 2026-08-25.

### Capability Onboarding Step

Job: When a capability asks for one setup decision or reports one setup phase, the user needs a
friendly, stable full-screen frame whose visual anchors do not jump between steps.

Status: Canonical. Explicit product/design-owner approval: Andrew, 2026-08-20.

Approved routes: Sequential capability-owned setup moments after a value-door introduction and
before entry into the application page. Money Target, Connect, Analyze, and Ready are the first
accepted implementation.

Three-second read: One setup moment, one grounded illustration, one decision or truthful status,
and at most one persistent action.

Scan order: Fixed logo/counter/close chrome -> centered two-line title region -> fixed illustration
anchor -> vertically centered decision or status -> canonical full-width action dock.

Anatomy: `CapabilityOnboardingStepScreen` owns the Parchment canvas, a 44pt top-chrome row, a
112pt minimum title slot using `titleMd`, a 232pt illustration slot, a flexible centered decision
slot, safe-area-aware scroll clearance, and `FullWidthActionDock`. Capability code does not replace
these dimensions or recreate the shell.

State continuity: Meaningfully different steps use distinct illustrations within one character,
setting, and rendering family. Transient substates of one step retain that step's illustration so
the dominant visual anchor does not move. External flows such as Plaid are temporary excursions;
their preparation, return, exchange, cancellation, and recovery remain owned by the same step.

Responsive and accessibility behavior: Titles reserve two lines even when copy uses one. Content
may scroll at enlarged text sizes without moving the action into scroll content. The counter has a
spoken capability-specific label, close remains a 44pt target, images have semantic labels, status
changes use live regions, and Reduce Motion follows the canonical loader and button behavior.

Do not use when: The capability is still making its value promise, the user has already entered a
native application page, multiple independent decisions are required, or the moment is better
served by an inline empty state. Do not add a progress track, cards, page chrome, floating gauges,
ambiguous physical objects, or a second primary action.

Last reviewed: 2026-08-20.

## Approved Input Direction in Migration

Andrew approved the filled-field family on 2026-09-10 and requested comprehensive migration and canonical future authoring. [Canonical input treatment](input-guidance.md) is the binding design/selection contract; the [implementation plan](../superpowers/plans/2026-09-10-input-unification.md) and [coverage ledger](../design-explorations/input-unification/migration-coverage.md) own delivery.

Default relationship: a label and one contrasting neutral input surface, without a resting border/shadow. Text fields, search and picker triggers share material; composers own one enclosing surface; inline content and accepted grouped forms use deliberate plain controls. Preserve the task's keyboard/completion/persistence behavior. Start from the existing Canonical Input and picker components; new adapters and changed compositions need their actual rendered evidence before implementation promotion. This record approves direction, not an unobserved native route or an app-wide completion claim.

## Initial Atlas

| Job / surface | Start from | Status | Required hierarchy |
| --- | --- | --- | --- |
| Settings | Canonical Secondary Settings Page for pushed management pages; `Settings/Patterns` Storybook for remaining top-level and modal settings work | Candidate | Match navigation depth first; then page title, groups, and rows. Destructive actions remain last and quiet until chosen. |
| Inventory / list | `PageHeader`, `InventoryControlGroup`, domain row component, `CanvasFlatList` | Candidate | Orientation and primary create action, controls, then scannable content. Avoid one Card per row unless the item needs a surface boundary. |
| Object detail | `ObjectPageHeader`, `CanvasScrollView`, domain sections, `KeyActionsRow` where appropriate | Candidate | Identity and current state, next useful action, then supporting detail. |
| Edit / create | `PageHeader` or `BottomDrawerHeader`, Canonical fields, `BottomDrawerFooter` or one page action | Candidate | Object identity, required fields, optional fields, one completion action. |
| Dialog form | `Dialog` anatomy plus `Input` or `FormField` | Candidate | Title/description, coherent fields, one submit action, quiet cancel. |
| Consequential confirmation | `AlertDialog` | Candidate | Consequence, destructive action, safe cancel. No dismissal ambiguity. |
| Small-set choice | `EnumPickerField` or `SmallSetPickerField` with `BottomDrawer` | Candidate | Current value, concise choices, selected state; no duplicate Save when selection is immediate. |
| Searchable relation choice | `RelationPickerField` | Candidate | Search, results, selected relationship, clear empty state. Presentation remains scope-sensitive. |
| Contextual menu | `DropdownMenu` and title-adjacent three-dot trigger | Candidate | Current surface remains primary; low-frequency actions are grouped and destructive actions are last. |
| Empty / permission / failure | `EmptyState`, `Dialog`, or inline feedback according to interruption cost | Candidate | What happened, what can be done now, one recovery action. Illustration remains secondary. |
| Focused emotional moment | `CapabilityOnboardingStepScreen` for sequential setup; capability-local composition for one-off moments | Candidate | One message and one action; illustration supports rather than competes. |

## Airbnb-informed Candidate Patterns

These patterns were extracted from the [August 2026 Airbnb mobile listing-detail study](references/airbnb-mobile/listing-detail-2026-08/pattern-extraction.md). Airbnb is evidence, not implementation authority; the rows below are Kwilt Candidate precedents and still require surface-specific acceptance.

| Job / composition | Start from | Required hierarchy | Exclusions |
| --- | --- | --- | --- |
| Narrative object detail | `ObjectPageHeader`, `CanvasScrollView`, flat domain sections | Identity/current state -> decision-critical summary -> supporting detail | No copied listing order, media-sheet silhouette, or decorative card stack. |
| Iconographic facts list | `Icon`, `Typography`, tokenized row layout | Section purpose -> concise labeled facts -> specific show-all action if needed | No traced glyphs, mixed decorative emoji system, or icon-only facts. |
| Compact evidence summary | `Typography`, semantic status/provenance components | Most decision-relevant truthful signal -> supporting signals -> explanation on request | No invented scores, trust badges, or equal emphasis for every metric. |
| Progressive section reveal | Flat section plus quiet disclosure action | Representative content -> truthful count/state -> optional full detail | Do not hide decision-critical information or use disclosure to repair weak grouping. |
| Horizontal evidence rail | Accessible horizontal list plus complete item anatomy | Section purpose -> independently legible items -> explicit full-list path when needed | No required sequence, inaccessible traversal, or clipped essential content. |
| Persistent decision region | Canonical Bottom Dock Geometry plus one primary `Button` | Decision context -> one current action; body remains readable above it | No duplicate primary action, tab-bar collision, keyboard obstruction, or screenshot-derived persistence. |
| Person/contributor summary | `Avatar`, `Typography`, truthful relationship/provenance fields | Identity -> relevant relationship or proof -> deeper detail | No host-card clone, copied verification badge, or metrics without product authority. |

## Entry Contract

Promote an atlas entry to Canonical only when it records:

```markdown
Job:
Status:
Approved routes:
Rendered references:
Three-second read:
Scan order:
Primary action:
Anatomy:
Canonical components:
States:
Responsive and accessibility behavior:
Allowed variations:
Do not use when:
RNR reference:
External-exemplar preserve/translate/reject ledger:
Kwilt localization:
Last reviewed:
```

The rendered reference is part of the contract. Code paths alone are not visual proof.

## Picking Rule

Use the closest Canonical atlas entry first. If none exists, use a Candidate only as a precedent, name the intended hierarchy and differences, render the real surface, and obtain surface-specific visual acceptance. Never assemble a screen from individually valid components without naming the composition pattern they form.

## Home feed — four patterns

Status: **Candidate**, Home-local scope. Andrew accepted the four-pattern direction on September 9, 2026; visual acceptance and canonical promotion remain separate.

Moment, Contribution, Personal message and Invitation/request share identity, context, response and overflow anatomy. Content and source context precede actions; the feed owns the 32pt rhythm. Personal messages emphasize words with a quiet continuation; requests emphasize purpose with one neutral participation action. State controls truthful availability rather than arbitrary urgency.

Contract: [Four feed patterns](../design-explorations/kwilt-home-feed-items/four-pattern-contract.md). Source: `src/features/shared-home/FeedItemParts.tsx` and the post/chore/message/request compositions. Review: `Home/Four Feed Patterns` Storybook, native Feed item lab, and the 46-variant review manager. Backend delivery records are not design-system component categories.

Home trial update: soft content cards with attribution below, accepted for implementation by Andrew on September 9. `FeedItemSurface` uses owned Card with a quiet fill and no elevation; `FeedItemMetadata` sits 8pt below the card, with 32pt between whole items. This supersedes the earlier open-item containment choice, retaining four candidate patterns.


### Home purpose-led composition trial (Candidate, September 9, 2026)

Supersedes uniform soft-card anatomy for the current Home trial. Moments use a light outlined compactCard surface, contributions use a compact leading boundary, messages use quotation typography on a neutral surface, and invitations retain one explicit outline action. Smaller name/time and explicit audience share a byline region with 44pt reaction/conversation/overflow targets. Saved and responder details are revealed through the shared menu. See `docs/design-explorations/kwilt-home-feed-items/four-pattern-contract.md`; user acceptance is still required for canonical promotion.

## External candidates awaiting scope and rendered proof

### Onboarding offer: price-led commitment — candidate trial, 2026-09-29

Implementation authorized after the offer refinements: `src/features/paywall/FoundingLifetimeOffer.tsx`, consumed by `ProPlanChooserScreen` when the lifetime product is ready and the person does not already have Pro. Native implementation is local; rendered Simulator/device acceptance remains pending. Existing subscribers and absent offers retain the existing chooser. This does not establish a new auth/Plaid boundary or automatically remove the preceding contextual paywall.

Current accepted presentation replaces earlier trial details: three reveal beats (rating; offer/price/terms; benefits/details), neutral stars with decorative laurels, muted-green `Badge` offer label, system-serif price and “Lifetime access,” raised leading dollar sign with full-size lining `19.99`, three regular-weight benefit rows with edge-to-edge separators and the hourglass for app limits. Localized non-dollar prices remain intact. CTA is the shared fully rounded **Purchase** button, not Apple Pay. Native keeps Other plans, restore, and legal links accessible. It uses the shared accessibility preference hook and canonical action-dock clearance. The existing `Badge` remains Candidate; this scoped use is not app-wide promotion.

Origin capture `07-introductory-offer.png` inspires the compact rating → offer → prominent price → explicit payment terms → informational benefits → bottom action hierarchy. Scoped to first-run Pro consideration, not every capability invitation or returning-user screen. Trial: `/Users/andrewwatanabe/.codex/visualizations/2026/09/15/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/landing-pattern-trial.html`.

- Preserve Kwilt type, white canvas, and fully rounded Canonical Bottom Dock Geometry; use price as this variant's focal point.
- Andrew requests average rating and stars **without the count**. Trial uses US App Store 5.0, checked 2026-09-29 at https://apps.apple.com/us/app/kwilt/id6755990439. Refresh before shipping; never reuse Origin member counts. Follow-up trial uses neutral stars and decorative laurel branches at Andrew's request; these do not denote an award or Apple endorsement. This narrowly supersedes the earlier no-laurels direction for this rating treatment only.
- Follow-up label: “Limited-time founding offer.” Andrew confirms this price will not remain available indefinitely. No invented expiration date, countdown or quantity. Revalidate/remove the label if offer policy changes.
- Price is the runbook's $19.99 founding non-consumable, not a fresh Store quote. Native must use the localized live product. One payment, no subscription; qualify lifetime as life of service. No fabricated discount, countdown, unlimited usage, or family-sharing claim.
- Optional `secondaryActions` slot supports future real promo/employer routes; empty means no links and no reserved gap. Neither is supported or displayed now. This does not remove required purchase terms, privacy, restore or existing alternate-plan access from production.
- “Get Kwilt Pro” invokes Apple in-app purchase in production, not Apple Pay or subscription billing. Trial only displays a boundary notice.
- Slow soft reveals are presentation, never an interaction gate; reduced motion shows content immediately. Scroll overflow must preserve fixed bottom action clearance.
- Adoption, precise journey placement, native component implementation, purchase states and runtime proof remain pending. Review unavailable/loading, owned, pending, failure/cancel, restore, larger text and reduced motion before promotion.

### Initial landing: atmospheric promise — owner-adopted design

Extension accepted 2026-09-28: the same atmospheric composition may serve selective invitations before meaningful setup, using a single message instead of landing's identity-line-plus-promise. Andrew approved the slower sequential fade/float refinement in the [motion trial](references/origin-mobile/first-run-2026-09/landing-trial.md). Keep background/logo continuous, action available and Reduce Motion immediate. Not a mandatory extra page or an app-wide animation rule. Native preset choice, implementation and runtime proof remain pending; the initial-only description below records the earlier adoption scope.

Andrew adopted this initial-app-landing-only pattern on 2026-09-28 after the [landing trial](references/origin-mobile/first-run-2026-09/landing-trial.md): calm shoreline video with a message-focused veil, subtle upper logo, one core promise using the actual app's existing copy treatment, and one fully rounded bottom action governed by Canonical Bottom Dock Geometry. No “Always on” equivalent, competing promotional message or feature list. Excludes choices, forms, offers, findings and routine returning use. Existing tokens and components are retained. Design adoption is explicit; native veil implementation and runtime/accessibility proof remain pending, so this entry does not claim a Canonical production implementation or promote the broader onboarding candidate.

- **Promise-led capability onboarding** — [Origin first-run evidence](references/origin-mobile/first-run-2026-09/source.md) and [Candidate flow contract](references/origin-mobile/first-run-2026-09/pattern-extraction.md), `PAT-onboarding-promise-led`. Andrew endorsed the learning direction and requested cataloging on 2026-09-28. Repeats promise, relevance, contextual commitments, guided setup, earned payoff and direct entry across capabilities—not identical screen counts or invented features. Existing Canonical Capability Onboarding Step and Bottom Dock Geometry remain authoritative; specific new variants, offer timing and runtime proof remain unresolved.

- **Focused modal background** — [Origin reference and candidate contract](references/origin-mobile/drawer-background-2026-09/source.md). Andrew likes the combination of dimming and obscured background detail (2026-09-28). Candidate for focused blocking drawers; this does not change the default for guides, coachmarks, or context-dependent tasks. [Initial source audit](audits/2026-09-28-drawer-background.md).

## Local — Biographer inventory scrollbar

Status: Local, accepted default design for Biographer's substantial entry inventory. Andrew explicitly adopted the refined interaction on 2026-09-28. Browser trial implemented; native implementation builds successfully for iOS Simulator and macOS with 19 passing core tests. Native visual review is blocked by Simulator computer-use permissions; physical-device proof remains pending. Not an app-wide Canonical primitive.

Job: Rapidly browse a long chronological inventory while retaining readable text-first cards and full content width.

Contract: Ordinary scrolling reveals a compact right-edge up/down handle. Its position tracks the full scroll range; dragging moves continuously without month snapping. A noninteractive month/year label accompanies the active drag. Release preserves the exact position and smoothly dismisses the label; the handle fades/slides away after inactivity. Entrance and exit reverse smoothly when interaction resumes. Scroll movement itself stays directly coupled to the finger. Emit a light selection haptic when crossing a month during active dragging, with no continuous buzz or ordinary-scroll haptics. Preserve keyboard/assistive access and Reduce Motion behavior.

Ownership: Inventory owns scroll position, gesture and haptic state; chronological grouping supplies the date label; cards retain their accepted white-page, rounded text-first presentation. Entry canvas remains separate. Exclusions: writing, recording, forms, empty/non-scrollable inventories; uncertain memory periods need their own truthful labeling treatment.

Evidence and trial constants: [Google Photos reference and revisions](references/google-photos-mobile/timeline-2026-09/source.md). Replaces the prior month-menu/stepwise overlay proposal for this scope. Native haptic feel, VoiceOver, large text, multi-year scale and device interruptions still require verification.
