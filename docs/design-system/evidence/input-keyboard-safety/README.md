# Basic input keyboard safety — September 10, 2026

Job: enter or edit a value near the bottom of a form while seeing the field, caret and its existing action.

Authority: Andrew's reported Areas defect and request for shared input behavior; input-guidance.md and the keyboard implementation guide; the existing canonical Input and SettingsPage. This repairs existing interaction, without changing the visual design direction or adding new save semantics. No new upstream component or dependency is introduced.

UI contract: the page title orients; the field and its current value are primary; Add and rename completion remain usable. Rename now completes with header or keyboard Done, as documented in the follow-up below. The host owns scrolling and clearance; Input supplies its frame and native editing; the feature owns draft/validation/submission. Preserve field focus and text through keyboard transitions. Required states: empty, typed, rename, keyboard already open, keyboard growing/shrinking and dismissal. Do not add an input-owned avoidance view, new confirmation, auto-submit or new publication behavior.

## Implementation scope

- Shared Input exposes whole-field `wrapperStyle` and registers the complete focused field frame. Existing inner `containerStyle` and native ref/callback semantics remain.
- KeyboardAwareScrollView retains field frame registration across keyboard height changes, ignores stale focus geometry, preserves explicit composite targets, and hydrates already-open keyboard metrics on mount.
- SettingsPage supplies the shared host by default. Nine ordinary forms migrated: Areas, Phone Agent settings, Chapter detail, Meal Plan editor, Meal Choice response, Recipe completion, Recipe import, Recipe editor, Money category creation. Recipe forms remove the superseded native avoidance wrapper.
- Areas/meal-plan/recipe row layouts use the outer field layout slot so actions and neighboring fields fit.
- Architecture lint rejects unmanaged scrolling fields, including aliased native scroll imports and local input wrappers. Exact existing exceptions retain four AiChatPane fields with its explicit keyboard controller and one GamePlayerSetup seat field whose parent frames differ. These are scoped follow-ups, not certification. Non-scrolling/dynamically composed/virtualized hosts still require runtime assessment.

## Verification record

Source checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`, base HEAD `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with existing unrelated uncommitted work preserved. Source-only changes served by Metro from that checkout on port 8081. Installed iOS development client 1.0.118; iPhone 17 Pro Simulator, iOS 26.5. The input-unification task yielded exclusive native ownership for this verification. No new native build, physical-device, Android, TestFlight or deployment evidence is implied.

Regression-first logs: `/tmp/kwilt-areas-red.log` (missing reveal host), `/tmp/kwilt-basic-input-red.log` (row layout and already-open keyboard), `/tmp/kwilt-input-frame-reveal-red.log` and `/tmp/kwilt-input-frame-height-red.log` (field frame contract), `/tmp/kwilt-keyboard-policy-red.log` (new unmanaged-host rejection). Focused source checks passed 48 tests across five suites before the final scoped gate; policy tests passed 33 tests.

Native route: To-dos → navigation → Settings → Activity areas. The original defect hid Add area completely. After the change the full field and Add clear the alphabetic keyboard and taller emoji keyboard. Switching to Rename Health keeps the native editor and Save visible; the unsaved Add draft remains. Screenshots are retained here. Submission/persistence is covered by the Areas tests; the native check uses an unsaved temporary draft.

Final scoped gate: `npm run verify:local -- --run --files <26 task files>` passed in 96.02s, exit 0; log `/tmp/kwilt-basic-input-verification-complete.log`. All 145 related Jest suites / 894 tests, app/test TypeScript, code health, architecture, whitespace and selected script tests passed. The scoped report lists unrelated changed files omitted from its approval; this is not an integration or release gate. Earlier attempts exposed a nullable type narrowing, the updated Input renderer's exact policy fingerprint, and two test harnesses missing their production safe-area provider; all were corrected. A separate attempt stopped on a parallel chat task's then-missing helper, which that task supplied before this stable run. Final app source is the source used for the native captures. Only this receipt documentation changed after the passing gate.

Independent read-only review found one namespace-import bypass in the new host check. It was reproduced red, corrected, and re-reviewed; all nine focused host-policy tests pass and no remaining actionable issue was reported. The two affected screen-test harnesses now use SafeAreaProvider rather than mocking away keyboard behavior.

Final native captures:

- [Alphabetic keyboard, typed value and Add](areas-keyboard.png)
- [Taller emoji keyboard with the complete field and Add visible](areas-emoji-keyboard.png)
- [Switch to rename with Save visible and the Add draft retained](areas-rename-keyboard.png)

The temporary draft was cleared by leaving Areas, without creating or renaming an area. Simulator ownership was released to the chat task after capture. Rendered critic: job clarity, reduction, hierarchy, system fit, composition, tested interaction/states and runtime proof PASS for this Areas route. The visible sequence is Areas → Add area → field/Add; no extra control was added, and the existing action now fits its row. Resilience across the two observed keyboard heights PASS; smallest devices, Dynamic Type, physical-device assistive technology and full-app custom-host acceptance remain unverified. These receipts do not promote those broader boundaries to passed.

## Areas rename refinement

Andrew's follow-up replaces the inline Save button with Done in the page header while renaming. The rename field uses the canonical filled Input treatment, with normal height, rounded focus feedback and space before the archive control. The native Done key and header Done invoke the same validated rename action. Empty or whitespace-only drafts remain open; a failed update preserves the draft. Native submission does not blur ahead of validation, and a successful update dismisses the keyboard. This completion contract belongs to Areas; it does not change other inputs' persistence semantics.

The earlier rename screenshot established keyboard clearance only; its plain, undersized field is superseded by this follow-up. [Current rename field, header Done and blue keyboard Done](areas-rename-header-done.jpg).

Native verification used the same checkout, branch and HEAD listed above, still with unrelated dirty work, Metro on port 8081, and the installed 1.0.118 (118) iOS development client. The current JavaScript app configuration displays 1.0.122; no new binary was built. A full Expo Reload was necessary to clear stale keyboard traits retained during Fast Refresh. After that reload, Rename Health automatically focused a fully visible filled field with the blue native Done key. Header Done and keyboard Done each finished editing and dismissed the keyboard; the existing Health name was retained. Simulator ownership was returned to the chat task afterward.

Regression-first check: `/tmp/kwilt-areas-header-done-red.log` failed four new completion cases before implementation. All six Areas tests pass afterward, covering header/keyboard completion, no premature writes, empty/whitespace drafts, update errors, and Add. The first scoped gate hit an unrelated dictation test type error, corrected by its owning task. The next gate passed every check but was marked stale because shared checkout inputs changed; that attempt is not a passing receipt.

Final attempt: `/tmp/kwilt-areas-header-done-verification-complete.log`, 3 selected files and 356 other changed files omitted. All six Areas tests, app/test TypeScript, architecture, code health and whitespace checks passed in 25.60s. The combined receipt was again marked stale (exit 1) because checkout inputs changed during verification, even with the Areas and chat source lanes held stable. The Areas source and test did not change during this attempt. This is focused test and native evidence, not a clean checkout-wide gate or release approval; repeated broad verification is deferred until the shared checkout settles. Only this receipt paragraph changed in this task after the checks.
