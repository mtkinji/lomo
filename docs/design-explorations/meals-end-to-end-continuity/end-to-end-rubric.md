# Meals End-to-End Excellence Rubric

There is no average score. Every critical item must pass with runtime evidence.

| Gate | Passing condition | Evidence |
| --- | --- | --- |
| Orientation | Within five seconds, the user can name what is selected and the one next move. | Screen observation on each state. |
| Food first | A meal can be found, opened, or captured before planning setup; the food remains visually primary. | Empty and populated Meals paths. |
| Direct selection | Add/remove takes one tap, immediately changes visible state, persists, and never creates parallel plan state. | Inventory and detail interaction plus reload. |
| Plan continuity | The selected count/list is reachable without losing inventory context, and the expanded Plan directly opens Meal Planning. | Drawer low/expanded states and navigation. |
| One next move | No plan state presents competing primary actions; labels describe the actual result. | Draft, collecting, ready, and finalized states. |
| Optional participation | The organizer can decide alone or ask selected household members; family input never blocks an ordinary plan. | Organizer and two-account household paths. |
| Decision integrity | Finalization preserves chosen meals, diners, servings, alternatives, and family-input truth. | Finalize and reopen exact plan version. |
| Grocery payoff | One action compiles the finalized plan; the list shows aisle-grouped items before optional tools. | Compile and Grocery normal state. |
| Review and provenance | Uncertainty and Already have state are actionable; every combined item can explain its recipe source. | Review-needed, Why?, correction, and ready states. |
| Honest shopping | Shop appears only for a ready list; retailer checkout remains explicitly retailer-owned. | Ready and handoff screens. |
| Recovery | Relaunch, back navigation, cache, offline mode, stale plan/list, and failed mutations preserve understandable state and recovery. | Cold relaunch and forced failure checks. |
| Cooking continuity | A planned meal opens the same clean detail/cook path and an active cook resumes without losing the cycle. | Plan → recipe → cook → relaunch. |
| Reduction | Every visible control or sentence helps orient, decide, act, or recover now; secondary context is revealed later. | Element-by-element UI review. |
| Resilience | Small viewport, long titles, Dynamic Type, VoiceOver, reduced motion, safe areas, and touch targets hold up. | Signed-device accessibility pass. |
| Runtime provenance | The observed bundle, branch, commit, Metro checkout/port, and device are recorded. | Verification log. |

## Current proof status

| Status | Gates |
| --- | --- |
| Passed in the August 7 iOS runtime | Orientation, food first, direct selection, plan continuity, one next move, decision integrity, grocery payoff, review and provenance, honest shopping, recovery, cooking continuity, reduction, runtime provenance. Recovery now includes cold relaunch, offline queue/reconnect, an honest blocked draft refresh, atomic stale-list invalidation, explicit rebase, carried-forward Already Have state, and zero-conflict ready-list restoration. |
| Still requires stronger hardware/account evidence | Optional participation on two accounts; VoiceOver and signed-device safe-area/touch proof. Maximum Dynamic Type passed in the iPhone 17 Pro Simulator after fixed line-height clipping was removed. The critical Meals → Plan → meal → Cook and Groceries → Shop spine passed at ordinary text size on an iPhone SE Simulator with Reduce Motion enabled. The combined SE + maximum-text check found and fixed handoff word fragmentation, but a full assisted scroll traversal remains unproved. |
