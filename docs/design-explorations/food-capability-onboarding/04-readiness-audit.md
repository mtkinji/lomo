# Readiness Audit: Make Meals Easier

Date: 2026-08-19

## Decision

**Implemented for development rehearsal; not promotion-ready.**

The source now delivers the accepted connected Food path from the capability chooser through two
manually paced moments into the existing Recipe library, with optional
Household attachment, Grocery authority, and touch-first Cook education. Production first launch
remains on the existing Quilt FTUE until rendered, backend, signed-device, TestFlight, and
production gates are satisfied.

## Current implementation evidence

| Gate | Current evidence | Decision |
| --- | --- | --- |
| One Food door | Development chooser offers **Make meals easier** with no Food subchooser | Source + focused test pass |
| Connected promise | Choose/add/share/vote and plan/shop/cook render as two fixed moments with Back/Next and Reduce Motion equivalence | Source + focused test pass |
| Real first action | **Browse recipes** opens the existing Recipe library and highlights a real Recipe card; no onboarding-only picker remains | Source + focused test pass |
| Individual-first Plan | `organizer_person_id` remains canonical; Household attachment columns are optional; new plans send `p_household_id: null` | Static migration + repository/screen test pass |
| Authoritative first value | The walkthrough and library entry do not claim completion; a later durable Plan receipt remains the required first-value evidence | Source contract; end-to-end receipt wiring pending |
| Optional Household | A personal draft stays private until **Share this plan** explicitly attaches it to an authorized existing Household | Source + focused test pass; live multi-account proof pending |
| Ingredients | Personal organizers and attached owner/caregivers have separate compiler authority; Recipe provenance and serving quantities remain intact | Deno compiler + static migration pass; applied-backend proof pending |
| Cook | A planned Recipe gets one person-scoped touch/resume explanation; existing exact Cook session restoration remains unchanged | Jest pass; signed-device interruption proof pending |
| Recovery | Walkthrough checkpoints persist and interrupted Food onboarding offers continue, another path, or look around | Source + focused test pass |
| Exact-context bypass | Entry policy keeps Recipe links, invitations, authoritative restores, and returning users out of generic onboarding | Policy test pass; full navigation rehearsal pending |

## Intentional release boundaries

- `CAPABILITY_ONBOARDING_RELEASE_STAGE` remains `development-rehearsal`.
- `make-meals-easier` remains `promotionState: development`.
- Normal first launch continues to use the existing Quilt questionnaire flow.
- No empty Household is created by onboarding, Plan creation, sharing, or Grocery compilation.
- The two Food moments use composed existing icons during development. The asset audit found no
  existing illustration set that truthfully communicates both jobs; illustration quality and
  Andrew's visual acceptance remain promotion gates.

## Proof still required

1. Apply the migration to a local or preview Supabase database and prove personal owner access,
   cross-user denial, explicit attachment, duplicate-draft rejection, and anonymous denial. Local
   execution is currently blocked because Docker is not running.
2. Render the complete rehearsal on the iPhone 17 Pro Simulator and accept normal text, large text,
   VoiceOver order, Reduce Motion, scrolling, interruption, and native handoffs.
3. Exercise a real existing Household with at least two accounts through attach, add/vote, Grocery
   access, and ordinary list additions.
4. Prove Cook cue restoration, orientation, keep-awake, timers, and interruption on a signed device.
5. Keep TestFlight and production evidence separate; promote Food and flip the global entry policy
   only in one reviewed release slice after all gates pass.

## Remaining experience gaps

- The composed icon scenes are truthful placeholders, not final accepted illustrations.
- The first compiled Grocery list relies on the native list's existing provenance, manual-add, and
  `Already have` education; a rendered rehearsal must decide whether one additional meal-loop
  explanation materially helps or merely repeats the walkthrough.
- Local database execution and advisor checks have not run in this checkout.
