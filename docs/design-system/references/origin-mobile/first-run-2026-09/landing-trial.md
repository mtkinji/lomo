# Initial landing: atmospheric promise — trial

Status: Owner-adopted design pattern for initial app landing, 2026-09-28 (Andrew: “Great, lets lock it in and continue”). Native implementation and runtime proof remain pending; no native app changes made in this trial.

## Contract

Job: welcome a first-time user, establish Kwilt's household promise and invite path selection.
Authority: explicit selections in `pattern-extraction.md`, Kwilt constitution and canonical tokens/Button/Bottom Dock Geometry; Origin `02-value-promise.png` supplies only selected composition qualities.
Three-second read: household promise → Get started. Secondary identity: Kwilt logo and “One app for life.”
Primary action: Get started; existing native destination is capability choice. Trial stops at this boundary and does not simulate account creation or any capability behavior.
Anatomy: full-bleed decorative shoreline, upper centered small mark, one centered copy group, fully rounded bottom action. No badge, feature list or commercial message. Initial landing only; exclude forms, offers, returning-use screens and capability choices.
Reuse map: native implementation owners are `HouseholdStarterFlow`, `OnboardingShorelineBackdrop`, `Logo`, `Button`, `FullWidthActionDock`; trial mirrors existing Inter 32/38 extra-bold title, 17/24 medium identifier, 28pt mark, 52pt button and 32pt resting dock clearances. No canonical token changes.

## Comparison and trial

Current source already provides the selected copy, logo, video, static fallback and bottom dock. The trial tests a localized veil: darker through the message, lighter above/below, instead of the source's uniform 55% Sumi veil. This is a proposed landing-only treatment, not an accepted change. Existing title weight is retained for evaluation.

Review artifact: `/Users/andrewwatanabe/.codex/visualizations/2026/09/15/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/landing-pattern-trial.html`.
Controls outside the mock: Moving, Still, Larger text, Current veil. The current-veil toggle compares scrim only; this is not a native before screenshot.

Browser trial checks: Chrome loaded local video (`readyState=4`, advancing time) and font files. Still mode paused media. At 320pt mock width and 150% copy size, copy height 402pt fit within the 466pt reading region with no horizontal page overflow. Button click explained the existing next destination without entering an invented flow. Screenshots inspected: message is dominant, one action, no unnecessary card surfaces; large copy remains separated from logo and dock.

Limits: browser composition study, not native route proof. Full-cycle contrast, loop quality, actual Reduce Motion preference, unavailable-video simulation, screen reader, native Dynamic Type and physical corner geometry are not verified by those checks. Production source remains unchanged in a heavily dirty shared checkout, `codex/onboarding-shoreline`, HEAD `59e8acff8831400a436407d463c58c10f5ff5f39`; no simulator/dev-server changes.

## Adoption decision

Andrew selected the existing actual app copy treatment over the initial browser approximation. Retain the app's copy, typography, wrapping, spacing and placement; adopt the message-focused shoreline veil, subtle upper logo, single promise and existing rounded bottom action for initial landing only. No badge or extra message. This is the default design direction for that scope, not permission to propagate it to other onboarding screen types. Existing typography and Bottom Dock Geometry remain authoritative.

The revised browser trial removes custom text balancing and copy translation, following the app source's chrome, content padding and copy-group relationships. Automated rerender was blocked by local browser restrictions after revision; earlier browser checks above apply only to the preceding version. Owner acceptance is recorded independently of that missing automated/native evidence.

Remaining delivery work: implement the scoped veil in the native owner and verify the actual route, accessibility and media states. The screen-by-screen design walkthrough may now proceed; no commit, push or release is implied.

## Atmospheric invitation extension: motion trial

Andrew selected the same composition for selective invitations before meaningful setup, rather than creating a separate pattern for Origin's `03-account-setup.png`. The message variant differs: identity line plus promise on landing, one invitation on the follow-on. This does not mandate an extra screen before every action or extend atmospheric treatment to forms.

Firsthand evidence: Andrew reports items fading/floating in sequentially, like a marketing landing page. Exact Origin timings are unknown. On 2026-09-28 he approved exploring connected motion variants. Trial uses existing “Let’s get your house in order” copy solely to demonstrate the single-message variant; direct landing-to-invitation navigation is a review harness, not an approved product sequence or replacement for capability choice.

Updated the same review artifact with Quiet and Spacious reveal variants, Replay, explicit Reduce motion, and Back. Background and logo persist. Proposed timings—not measured Origin behavior—are 440ms/150ms stagger versus 620ms/260ms stagger, both with an 8px float. The button stays available at minimum 65% opacity and subtly settles after the copy; it is never delayed or disabled. Reduce motion removes choreography and video; early focus/scroll cancels pending animation.

Validation: isolated JavaScript/DOM simulation passed sequential reveal, single-message navigation, immediate reduced-motion state and return to landing. This is not rendered motion proof. Fresh browser visual review remains pending; earlier local-file browser access was blocked. The design-owner must review pacing before adoption. No app code modified.

### Motion refinement accepted (2026-09-28)

The preceding timing values were rejected as too fast. The revised trial uses a 200ms initial pause, 950ms reveal / 500ms stagger for Quiet, or 1200ms reveal / 700ms stagger for Spacious; both use an 8px float and `cubic-bezier(.25,.1,.25,1)`. Button settling is 500ms, remains available, and has no disabled gate. Andrew responded “Yes, that's it” after this slowdown: the slower fade/float direction is owner-approved for the landing and selective single-message setup invitations. He did not explicitly distinguish between the two controls, so the final native preset choice remains open rather than claiming one was chosen. Reduced-motion behavior and stable background/logo remain part of the contract. This supersedes the pending-owner-review statement above, not its automated/native proof limits. No app implementation or release occurred.

## Local component extraction (2026-09-28)

### Follow-on choice trial (2026-09-28)

Andrew selected Origin capture 19's pill-shaped presentation and authorized a mock trial. The browser study now proceeds from landing to a path invitation, not an extra statement/Continue step. Preserve the anchored Kwilt heading and support, existing four path labels, slow sequential reveal and quiet Skip. Translate the reference pills into clearly interactive full-width rounded buttons, centered in the remaining space on a parchment canvas. Reject faded choices and the reference composer. No imagery, auth, pricing, or downstream setup is added. Larger text wraps and scrolls; reduced motion presents content immediately; keyboard focus settles the reveal. Selection and Skip report their intended destinations outside the phone because this two-screen mock does not implement the app routes. Initial landing is the contrasting excluded context: it retains its shoreline and single bottom action, not pills.

Trial file: `landing-pattern-trial.html` in the existing local visualization directory. Script syntax checked; fresh rendered/browser interaction proof remains pending. Native code is unchanged by this follow-on trial. Owner visual review and adoption remain open.

Andrew authorized implementation (“Make it so”). `AtmosphericInvitationScreen` now owns the two semantic message variants, existing copy geometry, logo, shared rounded bottom action and slow reveal. Quiet is the initial implementation preset (not a claim Andrew explicitly selected it over Spacious). Reduced Motion, screen-reader use, returning visits and early scrolling settle content immediately. No timer gates the action. `HouseholdStarterFlow` uses it for the existing landing and no longer duplicates the landing copy/layout. Capability choices and handoffs remain unchanged. `OnboardingShorelineBackdrop` stays mounted outside the changing content and now owns the approved dark gradient veil; poster/failure/reduced-motion behavior remains intact.

Implementation is local/uncommitted on `codex/onboarding-shoreline`, HEAD `59e8acff8831400a436407d463c58c10f5ff5f39`, in a shared dirty checkout. Metro port 8081 belongs to this checkout. The booted iPhone 17 Pro Simulator was displaying another app's sample-story surface, so it was inspected only and not redirected. This turn does not establish installed-build provenance, native animation appearance, VoiceOver or Dynamic Type acceptance. The component remains Candidate in implementation maturity while the scoped design direction is owner-adopted.
