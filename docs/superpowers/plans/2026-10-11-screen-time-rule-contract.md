# Screen Time Rule Contract Implementation Plan

> Execute inline in the existing checkout; no parallel agents or worktrees.

**Goal:** Make grouped Screen Time rules and unknown/freshness behavior consistent across the editor, persistence, JavaScript, and native enforcement.

**Architecture:** Keep the flat condition inventory and add an optional expression tree of condition references and ALL/ANY groups. Legacy records derive their expression from the existing connector. A condition catalog declares supported operators, multiplicity, signal owner, and freshness. A shared generated Swift core runs in host and extension, with the same fixture cases as TypeScript.

**Tech Stack:** TypeScript, React Native owned settings controls, generated Swift/Foundation, Jest, Node tests, Xcode.

## Contract decisions

- Every condition appears exactly once in the expression. Reject dangling/duplicate references, empty groups, duplicate group IDs, malformed operators, and more than four group levels. Existing flat rules normalize unchanged.
- ALL: any false wins; otherwise unknown wins. ANY: any true wins; otherwise unknown wins. Outcome inversion happens only after a known result.
- Unknown retains the last applied native decision; a never-evaluated rule introduces no block. Disabled rules still clear their own store. No cross-rule allow override is introduced.
- Time and weekday truth are computed from the local clock on every evaluation. Daily usage is local-day scoped. Host signals have observed/expiry timestamps; missing, future-dated, expired, or invalid evidence is unknown. Host reconciliation explicitly clears missing evidence instead of retaining old truth. Host facts require refresh on domain changes and app reconciliation; they are not claimed to refresh autonomously while the app is closed.
- Host observations have a bounded 15-minute freshness window. This bounds reuse during subsequent evaluations, not an OS delivery guarantee. Unknown does not silently release an existing block.
- Grouping UI operates on existing conditions/groups, keeps AND/OR meaning visible, supports ungrouping, and preserves groups through edits and the Money setup detour.
- Inventory summaries retain parentheses. Native and JavaScript explanations include only conditions participating in a decisive branch.
- The local build is the release channel. Physical-device transition, overlapping-rule, and app-closed checks remain a separate release gate.

## Tasks

- [x] Add expression/evidence regression fixtures: nested weekday windows, all/any short-circuit with unknown, stale/future evidence, inverse outcomes, and malformed expressions.
- [x] Implement `personalRuleExpression.ts`, condition catalog, and evidence resolution; integrate normalization, evaluator, duplicate fingerprint, and explanations.
- [x] Generate a reusable Foundation-only native core from `plugins/appleEcosystem/personalRuleCore.js`; use it in host and extension. Run the shared fixtures in Swift and Jest.
- [x] Pass timestamped host observations through `screenTimeProtection.ts`; clear absent evidence and stamp daily usage by local date in native callbacks. Preserve prior enforcement if a replacement starts with unresolved truth.
- [x] Add grouping controls to the existing rule builder and preserve expression state through save, remove, replace, and Money detours; test grouped save/reopen and ungroup behavior.
- [x] Review changed paths, run focused tests, then scoped `verify:local` once the candidate is stable. Rebuild native sources. Attempt Simulator interaction; report tool/device blockers without claiming runtime acceptance.

## Review scope

Preserve the existing weekday changes and unrelated `src/features/goals/GoalsScreen.creation.test.tsx`. Do not commit, publish, or deploy. This strengthens the Screen Time rule system; arbitrary action types, new sensor integrations, holiday calendars, and cross-rule priorities are outside this slice.

## Local handoff evidence

The final generated host and monitor compiled successfully for iPhone 17 Pro /
iOS 26.5 and were installed in the Simulator from `/Users/andrewwatanabe/Kwilt`,
`main` at base `399e26e3383d7496ab37db00b671e7326ea58da6` with uncommitted changes.
Simulator interaction remains blocked (`cgWindowNotFound`; earlier interaction
reported `noWindowsAvailable`). No physical-device enforcement claim is made.
A read-only review found two usage-cache issues; both were corrected and reviewed:
threshold/target changes invalidate usage evidence and equivalent same-day monitor
restarts retain reached state. The shared contract now contains 81 cases.
The first scoped verification exposed an eager Focus-store import regression;
the lookup is now lazy and the affected invitation/runtime regressions are rerun.
The final scoped verification receipt is the authoritative check result; unrelated
Goals and Supabase work is omitted from this task's approval scope.
