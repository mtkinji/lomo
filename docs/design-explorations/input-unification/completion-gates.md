# Input unification completion audit

Current source: `/Users/andrewwatanabe/Kwilt`, main at `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, shared dirty checkout. Companion site: `a5e46fb3d4053ab458d6bf8aa54d3da48fb7819a` plus existing dirty work. No commit, push, merge or deployment is claimed.

The [implementation plan](../../superpowers/plans/2026-09-10-input-unification.md) remains authoritative. This file replaces superseded ownership waits and interim counts; detailed chronological receipts remain in the [evidence README](../../design-system/evidence/input-unification/README.md).

## Current accounting

212 historical IDs:200 native implemented-awaiting-native,5 web implemented-awaiting-runtime,6 removed-verified-unused and1 removed-verified-consolidated.337 active AST sites (200 native controls and137 hosts) reconcile exactly with the ledger. No planned source-disposition rows remain. The policy baseline debt array is empty;30 exact owned/semantic exceptions remain subject to final review. This is source coverage, not200 accepted native controls.

## Requirement audit

| Plan task | Verified implementation/evidence | Still required |
| --- | --- | --- |
| 01 Discovery/enforcement | AST census, stable-ID ledger, alias/spread/wrapper and multiplicity checks; native/site consumers inventoried | Close runtime dispositions using actual acceptance evidence |
| 02 Shared material | Filled/flat defaults, token roles, shared frame, input states and multiline sizing; automated checks | Broader rendered/assistive/platform matrix |
| 03 Adapters | SearchField, picker forwarding, notes previews and owned editorial TitleInput; original draft/commit boundaries retained | Remaining adapter/host native acceptance |
| 04 Native pilots | Home/Chore/Global Search/Money and related narrow captures in evidence README | Complete empty/error/disabled, field-switch, long text, contrast, text scaling and assistive matrix; do not extrapolate one capture |
| 05 Ordinary forms | Source migrations and related tests | Authentication, secure/autofill/code and unvisited form/native states |
| 06 Food/repeating editors | Source migrations; recipe and keyboard-host coverage | Native lower-row long recipe editing, import/grocery/capture states and persistence equivalence |
| 07 Money/Explore/Games | Source migrations/domain tests; Places filter/clear screenshot | Amount/error/decimal behavior, Games code/name flows and remaining map/selection states using safe fixtures |
| 08 Editorial/rich/capture | Shared TitleInput, QuickAdd/composer/editor migrations; title long ending-caret/Done plus unsaved rich bold/Done/reopen observations | Controlled draft title, broader selection/insertion, persisted rich reopen, remaining formatting actions, expanded/capped and QuickAdd full native matrix |
| 09 Embedded web | Material mapping and17 focused tests pass; production build passes; native/site token JSON equal | Site-wide tsc blocked by unrelated publicRecipeEditorial test typing; current browser and actual native WebView host matrix |
| 10 Default/API retirement | InputTreatment/flags, legacy renderer, surface/ghost variants and elevated Input typing removed; unused EditableField elevation API removed; existing73 non-input/action token references retained | Post-default Place-name drawer long text/emoji/empty/Cancel verified; remaining forms/composers/pickers; final full candidate check after last cleanup |
| 11 Future adoption | Current guidance/Storybook API, canonical Input/SearchField/picker entries, CI guard selection and exact policy exceptions | Finish rendered Storybook state review and evidence-based maturity decisions; do not promote unproven editorial/rich contexts |
| 12 Integration | Current settled checkout passed the uncached integration gate:1257 suites/7715 tests,2 skipped, plus every configured static, backend, product, chat, architecture and verification-tool gate; final337-site/30-exception policy review and native/site token parity pass | Unresolved native/web acceptance and the unrelated companion-site standalone typecheck failure remain explicit |

## Latest verification receipts

- `/tmp/kwilt-default-switch-local.log`: passed112.69s,96 selected files/272 omitted,131 suites/816 tests plus types/architecture/health/whitespace/scripts. Exact337-site policy reconciliation.
- `/tmp/kwilt-input-integration.log`: verify:changed exit0,1251 suites/7680 tests passed,2 skipped, Supabase/product/chat-contract/agent-map/architecture/verification checks passed. This predates the last unused EditableField API deletion.
- `/tmp/kwilt-editable-api-cleanup.log`: scoped local gate passed35.95s after that deletion; no production caller supplied the removed prop. This is not a substitute for the final integration gate.
- `/tmp/kwilt-input-site-tests.log`:17 focused composer/material tests pass. `/tmp/kwilt-input-site-build.log`: production build passes. Both standalone site typecheck runs fail at `lib/publicRecipeEditorial.test.ts:23` because inferred costTier:string is not the required literal union. Build success does not supersede that failure.
- Material exporter --check and native/site snapshot cmp pass at the revisions above.
- `/tmp/kwilt-input-final-candidate-stable.log`: current uncached `verify:changed` completed every configured stage;1257 Jest suites/7715 tests passed,2 skipped. App/test and Supabase typechecks, Deno tests, product/chat checks, code health, architecture/input policy and verification-tool tests passed. Ten pre-existing raw-Text architecture warnings remain warnings.

## Native evidence boundaries

The single Simulator lane is the existing iPhone17Pro/iOS26.5 development shell (installed build118), using current source via Metro8081. It is not a newly built/released app. The previous keyboard/chat tasks completed; no active runtime ownership hold is assumed.

Banner header spacing and canonical search resting/focus/clear/first-tap Close are observed. Relation filtering, first-tap clear, close and query reset are observed without changing linked goals. Long persisted title ending caret and Done are observed after restoring the original draft. Places filtering and first-tap clear are observed; the attempted saved-place navigation was inconclusive. Relevant captures are in the evidence README. No blanket platform, accessibility, persistence or full-capability acceptance follows from these observations.

Use safe local/fixture states for remaining QA. Do not post real messages, mutate finances, change remote selection just to obtain a screenshot, or label browser/Storybook proof as native host proof. Unavailable required targets remain open unless Andrew explicitly changes that acceptance requirement.


Latest native progress: INP-010 Place-name drawer now has post-default alphabetic/emoji keyboard, long ending-caret, enabled/disabled Save and first-tap Cancel evidence. See native-place-name-long.png/native-place-name-emoji.png. No save/persistence or broad-platform claim.

Latest Storybook progress: explicit editorial draft/commit/read-only examples build and local commit/empty-restoration interactions pass. The browser title clipping regression is fixed with web-only intrinsic content sizing: the same long draft measures72/72px client/scroll height at414px and96/96px at320px, and shrinks to24px when shortened. Native behavior is unchanged. This closes browser growth only; native/assistive acceptance and editorial maturity promotion remain open. See the evidence README for before/after captures and scoped verification receipts.

Latest Games progress: INP-012/013 now have native code/name focus-switch, empty-value gating and alphabetic/emoji frame evidence. Fixed a reproduced lift/inset conflict with resize behavior and kept existing Join/Return actions in the fixed drawer bottom region. No table joined or profile saved. Header remains scrollable; this is not full Games/platform/persistence acceptance.

Latest recipe progress: INP-040/041/047 have native repeated ingredient, long instruction, selected-text replacement and deletion evidence with header Save/row actions reachable. The temporary blank recipe was discarded without saving. Clipboard paste, larger text, error/decimal and persistence remain open. Site tsc was rechecked and retains the unrelated recipe editorial fixture failure.

Latest QuickAdd correction: shared plain/inline Input no longer gains an inner focus box. Simulator caret/keyboard appearance is observed in native-quick-add-borderless-focus.png. Filled/outline focus and associated error behavior remain covered by regression tests. The full gate at /tmp/kwilt-input-candidate-integration.log passed before this correction (1254 suites/7702 tests, 2 skipped); final candidate verification remains open.

Latest catalog progress: 320px review now uses bundled Inter/Urbanist fonts and constrained specimens. Shared browser Input sizing keeps the populated SearchField clear action inside its fill; the redundant browser outline is removed while InputFrame focus remains. Final rebuilt catalog shows successful clear/focus retention. See storybook-search-contained-320.png and storybook-search-cleared-320.png. This is catalog proof only; companion-site/native WebView and broader accessibility gates remain open.


Latest native WebView progress: WEB-INP-001 has actual iOS drawer resting/first-tap focus/keyboard-clearance evidence from the local site build. Long entry was not accepted: hardware Enter submitted a test line; the verified test-only conversation was deleted. Original environment and keyboard settings were restored; Metro8081 and the original workbench URL3012 are running, Simulator back on To-dos. See the evidence README for the complete incident and cleanup boundary. Artifact/correction/voice/long-paste/accessibility and broader host proof remain open.

Latest authoring progress: canonical field examples have a dedicated Forms/Input Family catalog entry and a rendered embedded-versus-standalone comparison. Stale treatment-bridge notes and redundant copied props were removed from exception metadata without changing any allowance.0 debt/30 exceptions/337 sites remain. Runtime disposition and broader maturity gates are unchanged.

Latest account-form progress: INP-066/068 have three-step larger-text, first-tap email focus, direct name/email field-switch and keyboard-clearance observations. INP-067 has resting larger-text containment only. Contrast was toggled and restored; original text size and values were restored, with no field edit. No measured contrast, assistive-reader, maximum-size or persistence acceptance is implied.

Latest rich-editor progress: INP-170 through the INP-088 unsaved To-do draft caller has native bold selection, Done flush to the parent draft and reopen rendering evidence. The empty title kept Create disabled; the drawer was dismissed and All to-dos restored without creating a record. Persisted reopen, the remaining toolbar actions, paste, assistive and platform coverage remain open.
