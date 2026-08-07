# Evaluate Learning: Meals End-to-End Continuity

## Learning questions

- Can Maya move from the first meal choice to a shop-ready list without asking
  where to go next?
- Does optional family participation feel like help rather than a gate?
- Does the Grocery screen feel like a list first and a savings product second?
- After relaunch, does the active cycle resume at the truthful next move?

## Evidence

Supporting evidence is three natural meal cycles completed without setup help,
backtracking to rediscover state, or false retailer expectations. Disconfirming
evidence is hesitation at a handoff, repeated opening of global navigation, an
unexplained state change, or optional tools obscuring the list.

Use route/transition analytics already owned by the capabilities, direct
observation, and short qualitative notes. Do not collect ingredient contents,
private family responses, or behavioral surveillance.

## Decision rule

Keep the model when every critical item in `end-to-end-rubric.md` passes on the
real runtime. Revise the failing handoff before adding another surface or label.

## August 7 runtime pass

The first real iOS pass found four discontinuities that source-level tests had
not exposed:

1. Bundled catalog Recipe identifiers were sent through a UUID-only private
   Recipe lookup, so grocery compilation failed before it reached its intended
   authority error.
2. Revising a finalized plan preserved historical entries, but their restrictive
   candidate foreign key prevented the next draft from replacing candidates.
3. Already Have review had no completion action, so a list could never become
   ready and honestly reveal Shop.
4. A decided meal was readable but not actionable, leaving the plan disconnected
   from the recipe and Cook path.

Regression-first fixes now preserve bounded bundled ingredient snapshots,
retain immutable entry history without pinning editable candidates, re-key and
rebind revised occasions, provide one persistent **Done reviewing** action, and
make recipe-backed plan rows disclose directly into the same recipe snapshot.

Observed on iPhone 17 Pro Simulator, iOS 26.5, with the development client
`com.andrewwatanabe.kwilt` version 102. Metro was owned by
`/Users/andrewwatanabe/Kwilt/.worktrees/household-food-ai-exploration`, branch
`codex/meals-capability-refinement`, base commit `afc3e5b`, port 8081, with the
refinement diff intentionally uncommitted. The verified path was:

**Meals → one-tap add → Plan drawer → Review Meal Plan → Decide meals → Finalize
meals → Make grocery list → categorized 10-item list → Review what I already
have → Done reviewing → Ready to shop → Shop groceries.** The complementary
cooking path was **Meal Plan → planned meal → recipe → Before you begin → Cook
Mode**.

The ready list survived app termination and relaunch. The retailer handoff
truthfully stated that Instacart owns product choice and checkout; the external
provider link itself was not opened. After a second termination/relaunch, the
same planned recipe offered **Continue cooking** and restored Cook Mode at its
saved step.

## August 7 recovery and accessibility pass

A third reference loop treated the grocery list as an execution surface that
must remain useful when the network is unavailable. The implementation now
caches the last authoritative list, overlays item-state changes immediately,
coalesces repeat changes per item, and replays the device-local queue against
the latest server revision after reconnect. Final review, plan rebuilding, and
retailer handoff remain server-authority actions rather than pretending to
succeed offline.

The forced-offline runtime loaded the saved list after repository requests were
redirected to an unreachable endpoint. Checking **granulated sugar** changed the
needed count immediately and showed **1 change saved on this device**. After
Metro was restored to the production environment and the app relaunched, the
pending banner cleared while the checked state remained, demonstrating server
reconciliation rather than a display-only optimistic state.

Maximum Dynamic Type exposed a separate shared-typography defect: fixed line
heights clipped enlarged glyphs into fragments. The shared type primitives now
release fixed line height at accessibility sizes, navigation titles have a
bounded multiplier, and grocery rows switch to a stacked layout for narrow or
large-text conditions. The corrected iPhone 17 Pro Simulator screen rendered
complete headings and item text and kept the Shop action in scrollable content.
VoiceOver, a genuinely small viewport, reduced motion, and signed-device touch
and safe-area behavior remain explicit external gates.

There was no current production grocery list with `status = 'stale'`, so the
stale-list recovery presentation was not counted as runtime proof.

## August 7 constrained-interface pass

Loop four moved the same authenticated runtime onto an iPhone SE (3rd
generation) Simulator running iOS 26.5, using the same development-client build,
worktree-owned Metro server, production environment, and copied local app state.
The compact-width spine was observed at ordinary text size through **Meals →
Meal Plan → planned meal → Cook Mode** and separately through **Groceries → Shop
groceries**. Reduce Motion was enabled in iOS Settings before the final
navigation checks.

The pass found two defects that the iPhone 17 Pro had hidden:

1. At 375 points wide, long grocery items could push the separate **Why?**
   provenance control partly offscreen even though the earlier 320-point pure
   layout test passed. Grocery rows now stack below 390 points, keeping item,
   state, and provenance fully visible and independently focusable.
2. At the maximum accessibility text category, the shopping-handoff editorial
   headline broke words into fragments. Its scale is now bounded to 1.6 while
   the body and controls retain system scaling and the page remains scrollable.

After both regression-first fixes, the SE runtime showed the complete Meals
inventory cards and Plan affordance, a compact decided-plan card with one
primary **Make grocery list** action, the planned recipe and persistent cooking
control, a one-cue Cook Mode with all touch controls, stacked grocery rows with
complete **Why?** labels, and a readable handoff at ordinary text size. The
simulator accessibility tree exposed headings, buttons, checkbox values, and
action-specific labels for each observed screen.

This is not signed-device VoiceOver proof. Maximum text plus compact width was
visually rechecked for the corrected handoff headline, but a complete assisted
scroll traversal of every control could not be demonstrated with the current
Simulator automation. Those boundaries remain explicit rather than being
inferred from the accessibility tree.

## August 7 plan-revision recovery pass

Loop five exercised a real finalized-plan revision against the production
grocery authority. The first pass exposed three connected defects that ordinary
compile tests had missed:

1. `revise_kwilt_meal_plan` changed the plan to draft but left its existing
   ready list falsely current.
2. Returning from a newly finalized plan compiled immediately instead of first
   presenting a stale source list, bypassing the explicit preserve choice.
3. Rebase carried edits and manual items but not item state, so **Already Have**
   could be lost even while the UI promised to preserve changes.

Regression-first changes now stale active lists atomically with plan revision,
resolve a finalized plan to an exact current list or its latest stale source
before compiling, keep stale items read-only, discard obsolete queued stale-list
mutations, record item-state changes in the correction ledger, and apply the
latest state when matching recipe provenance survives rebase. Both replacement
database functions remain permanent-user/owner guarded, `security definer` with
an empty search path, and explicitly schema-qualified.

Observed on the same iPhone 17 Pro Simulator and worktree-owned Metro runtime,
the final path was **ready groceries → Change meals → stale groceries → blocked
refresh while draft → finalize revised meals → Make grocery list → stale source
list → Refresh and preserve my changes → 1 change was carried forward → review
→ Ready to shop**. The stale list retained nine needed items and checked sugar;
its item controls were read-only while the recovery action remained available.

Production verification ended with finalized plan version 18 and one current
ready list compiled from version 18, rebased from list revision 7. The resulting
list had nine needed items, one `already_have` item, one
`rebased:user_elected` correction, and zero rebase conflicts. The intermediate
idempotency rejection was preserved as evidence rather than bypassed or
destructively deleted.
