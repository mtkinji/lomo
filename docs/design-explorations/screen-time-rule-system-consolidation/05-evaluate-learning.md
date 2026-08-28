# Evaluate Learning: Screen Time Rule System Consolidation

## Learning objective

Determine whether one sentence-based rule system makes Screen Time understandable and dependable across Kwilt, and whether the clean cutover can remove the legacy personal and Money systems without leaving duplicate, orphaned, or unexplained native enforcement.

## Learning questions

### 1. Can the user understand the rule before saving it?

- Can Andrew read the sentence and accurately predict which apps are affected, whether they will be allowed or paused, and when?
- Does the sentence remain understandable with two conditions and an AND/OR connector?
- Are the interactive fields recognizable as editable without returning to underlines, dense settings rows, or explanatory subcopy?
- Does **Allow access** remain concrete enough when combined with daily allowance, time, Focus, real-step, and budget conditions?

### 2. Does one composer remain coherent across entry points?

- Does entering from Settings feel like building a Screen Time rule?
- Does entering from Money preserve enough budget context without feeling like a separate Money rule system?
- Do Focus and real-step entry points prefill useful context without creating a different setup flow?
- Does Back return to the exact originating surface without losing or silently saving the draft?

### 3. Does the visible rule match enforcement?

- Do AND and OR produce the behavior the sentence promises?
- Do overlapping rules remain independently active, with an app paused while any applicable rule still requires it?
- Do time, daily usage, Focus, real-step, and budget truth refresh at the correct moments?
- Does the shield or in-app explanation name the active rule conditions accurately?

### 4. Is lifecycle behavior consistent and complete?

- Does the list switch immediately enable or disable the same rule shown in detail?
- Do edit, save, relaunch, delete, and temporary open affect exactly one stable rule aggregate?
- Can deletion or disablement leave a native restriction active?
- Can a retired Money runtime recreate a restriction after the canonical rule is disabled or deleted?

### 5. Is the clean cutover safe?

- Does install-over-current-build clear every known legacy personal and Money native selection before deleting its record?
- Is cleanup idempotent across interruption and relaunch?
- Does the canonical empty state appear only after cleanup is complete or explicitly recoverable?
- Can any legacy route, writer, foreground sync, or inventory projection recreate retired state?

### 6. Is the ownership boundary durable?

- Can Money supply budget choices, labels, predicates, freshness, and current truth without persisting or enforcing Screen Time policy?
- Can another condition provider follow the same boundary without expanding the user-facing rule language?
- Does Chat address the same canonical rule IDs rather than inventing another representation?
- Does Household retain authority differences without requiring a different composer grammar?

## Evidence that supports the bet

### Comprehension evidence

- Andrew can explain representative rules correctly before saving them.
- He can change a condition or connector without becoming disoriented about where he is in the flow.
- He does not look for a separate behavior page, Money editor, receipt card, or settings-style management section.
- The same rule remains understandable when reopened from the list and from its contextual capability.

### Behavioral evidence

- Representative one- and two-condition rules produce the predicted state on a signed iPhone.
- AND, OR, and overlapping-rule cases match deterministic evaluator tests and device observation.
- Toggle, edit, relaunch, temporary open, and delete preserve one stable identity and leave no orphan restriction.
- Contextual Money entry saves a canonical rule and no Money Screen Time record.

### Cutover evidence

- Installing over the current development build clears every old selection and lands on the canonical empty state.
- Repeating or interrupting cleanup does not crash, duplicate work, or reactivate a rule.
- Static search and route tests show no reachable legacy editor, writer, reconciler, inventory domain, or foreground-sync alias.
- No native restriction remains associated with retired selection IDs after cleanup.

### Trust evidence

- Recovery copy explains what the user can do without exposing internal migration concepts.
- No rule disappears while its restriction remains.
- No private app identity or financial detail appears in logs or analytics.
- The user can always find how to disable or delete a rule.

## Evidence that disconfirms the bet

- Andrew cannot predict the outcome of a two-condition sentence or repeatedly confuses AND and OR.
- Money entry needs so much unique UI that the common composer becomes a shell around a second editor.
- Identical-looking rules produce different behavior depending on their condition provider.
- Native app selection is lost, duplicated, or attached to the wrong aggregate during create/edit.
- A disabled, deleted, or cleaned-up rule continues to pause an app.
- Relaunch or Money refresh recreates a retired restriction.
- Cleanup can delete a record without proving native clearing or cannot recover after interruption.
- The system requires permanent dual storage or reconciliation to remain correct.
- The composer accumulates provider-specific instructions, badges, or management sections until it again resembles Settings rather than a readable rule.

## Evaluation matrix

The learning release must exercise at least these cases:

| Case | Visible statement | Required proof |
| --- | --- | --- |
| Time only | Allow Social when time is after 5:00 PM | Simulator state + signed-device availability |
| Daily usage only | Allow Social when daily use is below 15 minutes | DeviceActivity monitoring and reset |
| Real step only | Allow Games when a real step is complete | Event refresh and relaunch |
| Focus only | Pause Social when Focus is active | Focus start/end enforcement |
| Budget only | Pause Shopping when Shopping is 95% used | Money truth refresh and contextual entry |
| AND | Allow Social when after 5:00 PM AND below 15 minutes | Both conditions required |
| OR | Pause Shopping when 95% used OR transactions need review | Either condition sufficient |
| Overlap | Two active rules target Social | One satisfied rule does not clear the other |
| Lifecycle | Toggle, edit, relaunch, temporarily open, delete | One stable aggregate and no orphan |
| Clean cutover | Install over current development state | Old rules removed only after native clearing |
| Cleanup interruption | Stop/relaunch during cleanup | Safe idempotent resume |
| Context return | Enter from Money and return | Same composer, exact destination, no duplicate rule |

## Instrumentation

### Automated

- Pure evaluator tests for each condition, AND/OR, overlap, and state transitions.
- Regression tests for atomic rule create/update/toggle/delete.
- Cleanup tests covering every legacy shape, partial progress, repeated execution, missing native selections, and native-clear failure.
- Route and inventory tests proving all personal rules resolve to the canonical composer.
- Static retirement checks preventing imports of legacy writers, screens, reconcilers, and storage keys.
- Generated native bridge tests for rule projection and named-store cleanup.

### Simulator

- Screenshot states for empty inventory, one rule, mixed conditions, invalid draft, saved detail, lifecycle menu, swipe delete, cleanup recovery, and contextual Money entry.
- VoiceOver labels and largest Dynamic Type for the sentence fields, connector, list switch, menu, and recovery action.
- Relaunch and navigation-return observation through the exact source checkout and Metro server.

### Signed physical device

- A manual evidence ledger recording build/commit, entitlement state, rule statement, selected target count, trigger inputs, expected result, observed result, relaunch state, and cleanup result.
- Install-over-current-build validation before a fresh-install test so cleanup is not accidentally bypassed.
- Representative native shield screenshots without exposing private app identities.

### TestFlight

- Only after local signed-device acceptance.
- Install over the immediately preceding accepted build, then repeat cleanup, budget, AND/OR, overlap, lifecycle, and relaunch cases.
- Record build number and installed-binary provenance separately from source and Simulator proof.

### What we will not track

- Bundle identifiers or opaque app-selection tokens.
- Individual financial amounts, transactions, merchants, or budget balances.
- Counts framed as productivity success, streaks, or compliance scores.
- Screen recordings or behavioral analytics beyond what is necessary to prove rule-system correctness.

## Decision rule

### Accept as the permanent personal rule system when

- Andrew understands and successfully edits every evaluation-matrix sentence.
- All source, cleanup, retirement, navigation, accessibility, and native bridge gates pass.
- The signed-device matrix passes with no unexplained, duplicate, or orphan restrictions.
- Install-over-current-build cleanup completes or recovers correctly.
- Contextual Money entry requires no separate ownership or editor.
- No legacy write or runtime path remains reachable.

### Revise before acceptance when

- The sentence grammar is correct but one or more fields are not discoverably interactive.
- A condition provider needs a clearer value label or source-evidence destination.
- Back/return, temporary open, explanation, or recovery creates avoidable confusion.
- Device behavior is correct but the visible sentence does not explain it accurately.

### Stop distribution and repair when

- Cleanup can orphan a restriction.
- A deleted or disabled rule remains active.
- AND/OR, overlap, or provider truth disagrees with the visible rule.
- The installed build does not match the source/runtime provenance used for acceptance.

### Reframe only when

A condition demonstrably cannot supply typed truth to the canonical aggregate without owning a separate lifecycle. Complexity or historical ownership alone is not enough to restore a separate subsystem.

## Expected next action

After this evaluation plan is accepted, produce the canonical feature brief and implementation plan. Build the cleanup and one canonical write path first, then remove legacy routes and runtimes before expanding Household support. After the signed-device learning release passes, update the relevant job-flow delivery evidence and run post-ship reflection.
