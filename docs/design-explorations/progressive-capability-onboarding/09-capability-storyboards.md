# Capability storyboards — first visual pass

Status: proposal for review; not approved, implemented, or runtime verified.
Extends [08-origin-capability-paths.md](08-origin-capability-paths.md).

## Creative direction

A quiet invitation followed by useful work. Keep the approved white canvas,
anchored medium-weight introduction, underlined Skip, compact icon-led choice
pills, and rounded bottom action. The content—not a different visual theme—makes
each path distinct. No additional testimonial, artificial analysis, or offer
screen just to equalize page counts.

Reference authority: `docs/design-system/pattern-atlas.md`, Onboarding path
invitation and Continuity into capability invitations. The existing
`landing-pattern-trial.html` supplies the accepted layout precedent. Origin's
sequencing and gradual reveals are selected mechanisms; its exact screens and
payment position are not universal requirements.

The companion visual is an invitation study with a screen-by-screen handoff
ledger. It does not impersonate native permission sheets or present fabricated
personal results. Its actions switch review states only.

## Goals

1. **Invitation:** “Turn a goal into a next step.” Supporting copy: “Start with
   something you want to do.” Action: **Shape a goal**. Free entry; no offer.
2. **Existing guided creation:** hand off to FirstTimeUx / IdentityAspirationFlow.
   Preserve its actual prompts and draft. Audit the length of this flow separately;
   do not imply this study has replaced it with a one-field form.
3. **Review:** the real proposed goal and starter to-do. Reuse the existing
   aspiration/goal review rather than inventing a score or personalized diagnosis.
4. **Confirm and persist:** current implementation creates an Arc, Goal and starter
   Activity. Account timing must respect the actual app boundary. Guest drafting
   and deferred sign-in are not implemented by this proposal.
5. **Arrival:** open the saved goal with its first to-do visible. Scheduling can be
   offered contextually; it must not delay first value. No automatic Pro pitch.

Return reason: do the next step and see progress. Optional paid Screen Time is a
later response to distraction, not a prerequisite for having a goal.

Stress cases: generation fails → retain inputs and offer supported retry/manual
creation. Verify the manual route before wiring that fallback. The legacy Arc
limit call site is not an active gate: current `src/domain/limits.ts` always
allows Arc and Goal creation. AI service allowances remain a separate concern.

## Meals

1. **Invitation:** “Bring everyone’s ideas to the table.” Supporting copy:
   “Start with one meal. Invite your household when you’re ready.” Action:
   **Choose a recipe**. Free entry; no offer or household-creation gate here.
2. **Recipe library:** use the existing `onboarding: pick-meal` entry. Choose an
   actual recipe, or use supported save/import. Do not invent an automatically
   generated week or require dietary profiling.
3. **Add to Plan:** use the existing action, then show that recipe in the persistent
   Plan. This is the first useful artifact; not a generic success interstitial.
4. **Optional participation:** invite people into the supported household/shared
   Plan surface. Explain access there. **Not now** continues with the same Plan;
   never wait for someone else to accept before allowing use.
5. **Optional groceries:** select meals to send to Groceries, then review actual
   compiled ingredients. People who came for meal ideas can remain in Plan.

Return reason: add ideas together, choose meals, and use the grocery list. No
mandatory weekly schedule, budget connection, retailer account, or Pro offer.

Stress cases: no saved recipes → supported browse/import entry, not an empty dead
end; household invitation declined → personal Plan still useful; compilation
fails → preserve selected meals and expose retry without claiming a list exists.

## Screen Time

1. **Invitation and intent in one screen:** “Make room for life off-screen.”
   Supporting copy: “Start with a simple limit.” Choices: **Set a daily limit** and
   **Protect a Focus session**. A quieter **Explore advanced controls** route
   makes the differentiator discoverable without forcing its dependencies.
2. **Basic setup:** use the rule builder's contextual Apple authorization, native
   app picker, and existing condition editor. Do not simulate a native permission
   decision or ask users to connect Money.
3. **Review:** selected apps, daily allowance or Focus condition, and when the rule
   applies. Save through the existing builder.
4. **Arrival:** actual rule detail and delivery state. A saved rule is not proof
   that protection is active. Show permission/device/pending status honestly.

Advanced fork, only after the person chooses it:

- Real-step completion: explain the actual qualifying-step semantics, then the
  existing contextual Pro boundary. Do not promise a selector for any arbitrary
  Goal or whole-goal completion. The current evaluator receives a
  `realStepComplete` value; that alone does not prove which completion events feed
  it. Complete the event-producer audit before finalizing customer-facing copy.
- Budget: an existing eligible category can be reused. Without one, show
  “A budget comes first.” / “Budget-based limits use a budget in Money. You can
  set that up, or start with a daily limit.” Actions: **Set up Money**,
  **Use a daily limit instead**. Do not open Plaid automatically.
- Purchase cancellation: return to the unfinished rule; keep the basic path open.
  Purchase success is entitlement, not permission or successful enforcement.
- Child-device setup is a separate route through existing family/caregiver and
  device requirements. Do not reuse the personal-device permission flow or claim
  that a parent-device save protects an absent child device. Its exact entry and
  eligibility require a current family-route audit before adding it to this mock.

Return reason: change limits as routines change and use Focus. Pro is the chosen
advanced relationship between actions/budgets and app access, not an entry toll.

Recovery specimen: “Screen Time needs your permission.” / “Your rule isn’t active
yet. Allow Screen Time access to use app limits.” **Review permission** plus
**Not now**. The implementation must use the correct native recovery route for
denied versus not-yet-requested access; neither action here grants permission.

## Shared pacing and proof

- Invitation copy enters together; choices enter together after it. Use the
  accepted 200/700ms starts, 950ms fade and 8pt float. This is attention guidance,
  not an interaction lock.
- Page movement precedes content reveal. Back/return, Reduced Motion and screen
  readers get settled content. No repeated dramatization of previously seen data.
- Owned forms, pickers and provider sheets retain their interaction contracts.
- Preserve drafts across any identity, purchase or dependency detour. This is an
  acceptance requirement, not a claim that every route already does so.

## Creative review / handoff

Source review: consistent introduction position, compact choices, independent
bottom actions, no placeholder result data or fake testimonials. Copy-only Goals
and Meals invitations intentionally leave quiet space; assess whether those
extra invitation taps are useful in the first runtime trial. If redundant, merge
the promise into the first useful owned surface instead of adding decoration.

The review artifact includes a missing-budget branch and permission-recovery
state. Larger text wraps and expands the specimen rather than shrinking text.
Browser rendering is not verified in this pass because the prior local-preview
access restriction remains unresolved. Source review does not establish visual
acceptance, actual animation behavior, native layout, accessibility, or activation.

Build blockers: current family-route audit; real-step event semantics; exact
identity/resume boundaries; owner review of the invitation copy and sequencing.
No changes to app code, entitlements or backend configuration in this design pass.

## Follow-up source audit: Screen Time promises and family entry

Inspected current sources, not runtime enforcement:

- `src/services/screenTimeProtection.ts` defaults qualifying actions to completed
  to-do, recorded progress, or a completed Focus session of at least 10 minutes.
  The default unlock period ends at the next local day; settings can vary.
- `src/store/useAppStore.ts` forwards those events to
  `recordMeaningfulFirstQualification`. ActivityDetailScreen records completion
  and progress; FocusSessionRuntimeHost emits a completed Focus event with its
  duration. Other completion surfaces also emit qualifying events.
- `src/services/screenTimeProtectionRuntime.ts` derives the composite condition
  from the shared meaningful-first unlock expiration and supplies it to each
  composite rule. It does not match an arbitrary selected Goal ID.

Consequent copy direction: **“Make progress before opening your apps.”** Explain
the actual qualifying to-do/progress/Focus choices at rule review. Do not say
“Finish this goal to unlock” or imply a goal-specific binding. The differentiator
is progress-connected access, not proof of completing a particular goal. Native
enforcement and all event-surface consistency remain unverified by this audit.

The family entry has two distinct existing routes:

1. Local child-iPhone setup: ScreenTimeProtectionSettingsScreen sets
   `authorizationMember: child`, asks for child authorization, then enters the
   local rule builder. This is not remote setup on a parent's phone.
2. Household management: one known child opens SettingsFamilyScreenTime;
   otherwise the existing entry opens SettingsHousehold. Its setup state machine
   proceeds through connected device, chosen apps, reviewed agreement, child
   preview, activation, and completion only when appliedVersion equals
   desiredVersion.

Consequent onboarding decision: keep the personal simple-limit path immediate.
Offer **“Set up for a child”** as a secondary route, then distinguish “on this
child's iPhone” from household management before requesting permission. Reuse
the family setup state machine; do not squeeze it into the personal three-step
story or call a pending activation complete. Current caregiver authorization,
family entitlement, device delivery and recovery must be checked before wiring
this branch; the existing route is evidence of structure, not release proof.

## Commercial boundary audit

Current source evidence, not a production configuration or purchase test:

| Selected job | Current boundary | Onboarding implication |
| --- | --- | --- |
| Create an Arc or Goal | `src/domain/limits.ts` always permits creation | No Pro offer for first creation; do not preserve an obsolete limit in the storyboard. |
| Choose recipe → Plan → Groceries | No purchase call found in the inspected capability UI or food-first-cycle guide | Keep this basic loop free. Recipe AI suggestions send Pro status separately, so do not advertise unlimited AI. Backend/service allowances still need verification. |
| One daily-use or Focus condition | `screenTimeAccessPolicy.ts`: `free_basic` | Direct basic setup without an offer, Money, or Goals. |
| Real-step, budget, time-of-day, or combined conditions | `pro_advanced` | Contextual offer after explicit advanced intent; preserve the rule on return. |
| Family device enrollment/coordination | Separate family Pro check, including HouseholdDeviceSetupScreen | Disclose paid family coordination before starting device enrollment. Do not label all child-device setup free. |

The advanced-personal paywall flag defaults to paid unless explicitly disabled;
the code says family coordination remains independently gated. No live flag was
changed or verified here. Safety actions (read, release, disable, revoke, cleanup)
are classified as always allowed; the onboarding must not put a purchase gate in
front of removing restrictions.

Review needed before implementation: approve the proposed invitation copy and
path order. The source-backed boundary audit resolves the basic commercial
structure, but does not approve new copy, prove native delivery, or authorize
changes to production pricing or feature flags.
