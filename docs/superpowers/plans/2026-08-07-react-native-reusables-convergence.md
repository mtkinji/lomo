# React Native Reusables Convergence Implementation Plan

> Execute in the isolated `codex/react-native-reusables-convergence` branch. Preserve the dirty recipe-catalog work in the main checkout. Do not start Metro or Simulator from any other checkout while this lane owns visual QA.

**Goal:** Make RNR the explicit upstream native component reference, then harden Kwilt's shared menus, dialogs, confirmations, and form anatomy without adopting NativeWind or breaking existing callers.

**Architecture:** ShadCN supplies the authoring model; RNR supplies native anatomy/composition; RN Primitives supplies compound behavior where it fits; `src/ui` owns the localized API and `src/theme`/`@kwilt/tokens` own appearance. Compatibility APIs remain available while representative production callers move to the stronger anatomy.

**Reference:** React Native Reusables `119d0b101ff0d18408dc392120e12b5c78ae0c05`, retrieved 2026-08-07 from `https://github.com/founded-labs/react-native-reusables`.

**Tech:** Expo 55, React Native 0.83, React 19, TypeScript, `StyleSheet`, `@rn-primitives/*` 1.5.x, Jest, Testing Library, Storybook.

## UI contract

Job: When a person edits settings or invokes a contextual action, they need to understand the current decision and act without decoding inconsistent controls, so they can continue confidently.

Authority chain: accepted behavior → native/accessibility conventions → Kwilt constitution/tokens/Canonical components → RNR reference → current callers.

Three-second read: the dialog purpose or menu actions; in a form, the first required field and one completion action.

Primary action: one submit/action for the current decision. Destructive menu items and secondary form utilities remain quiet until chosen.

Scan order: title/purpose → fields or menu items → primary completion action.

Must not add: NativeWind/Uniwind, a second token system, direct feature imports of behavior primitives, card soup, placeholder-only labels, or broad unrelated screen redesign.

Proof path: Storybook component stories, actual Activities view-settings route, an existing contextual menu route, smallest iPhone Simulator viewport available, large text, keyboard, backdrop/escape/back semantics, and visual-critic comparison.

## Task 1: Lock the design-system authority

Files:

- Add `docs/design-system/ui-constitution.md`
- Add `docs/design-system/pattern-atlas.md`
- Modify `docs/design-system/README.md`
- Modify `docs/design-system/component-inventory.md`
- Replace stale `docs/ui-architecture.md`
- Quarantine `docs/ux-style-guide.md`

Verify with `npm run product:lint` and link inspection.

## Task 2: Enforce the local UI boundary

Files:

- Add `src/ui/Portal.tsx`
- Modify `scripts/architecture-lint.mjs`
- Modify direct `@rn-primitives/portal` imports in `App.tsx`, navigation, and feature host wiring

First make architecture lint reject new `@rn-primitives/*` imports outside `src/ui` while allowing a documented migration baseline if any non-UI exception remains. Then route portal imports through `src/ui/Portal` and run `npm run architecture:lint`.

## Task 3: Harden DropdownMenu from the RNR reference

Files:

- Add `src/ui/DropdownMenu.test.tsx`
- Modify `src/ui/DropdownMenu.tsx`
- Modify representative contextual menu callers

Write failing tests for standardized label/icon anatomy, selected state, and destructive semantics. Add an app-owned `DropdownMenuItemContent`/label path while retaining arbitrary-child compatibility. Tighten menu width, padding, overflow, pressed/disabled/destructive states, and remove the current unused destructive variant. Migrate representative Recipe, Money, and Activity menus to the standardized path. Run the focused tests and related caller tests.

## Task 4: Localize RNR dialog anatomy behind the existing API

Files:

- Modify `src/ui/Dialog.accessibility.test.tsx`
- Modify `src/ui/Dialog.tsx`
- Add or modify Storybook stories for dialogs

Write failing tests for dialog role, controlled close, title/description/body/footer anatomy, close affordance, backdrop dismissal policy, keyboard-safe scrolling, and accessibility escape/back behavior. Implement RNR-aligned compound exports using `@rn-primitives/dialog`, while keeping `<Dialog visible onClose title description footer>` compatible. Use Kwilt tokens, reduced motion, safe bounds, and a single coherent spacing rhythm.

## Task 5: Add AlertDialog as a distinct confirmation primitive

Files:

- Modify `package.json` and `package-lock.json`
- Add `src/ui/AlertDialog.tsx`
- Add `src/ui/AlertDialog.test.tsx`
- Modify `src/ui/primitives.ts`
- Add or modify Storybook stories

Install the matching stable `@rn-primitives/alert-dialog` version. Write failing tests proving a safe cancel, explicit action, no backdrop-dismiss ambiguity, role/title/description semantics, and controlled close. Localize the RNR anatomy and Kwilt Button variants without exposing the behavior package to feature code.

## Task 6: Add coherent form-field anatomy

Files:

- Add `src/ui/FormField.tsx`
- Add `src/ui/FormField.test.tsx`
- Modify `src/ui/Input.tsx` only where shared identity or error state needs hardening
- Modify `src/ui/primitives.ts`
- Add or modify Storybook stories

Write failing tests for label/control identity, optional description, error announcement, disabled/error state, and custom-control composition. Implement a small field anatomy that complements rather than duplicates `Input`.

## Task 7: Correct the production view-settings dialog

Files:

- Modify `src/features/activities/ActivitiesScreen.tsx`
- Remove or converge unused `src/features/activities/ActivityViewEditor.tsx`
- Modify `src/features/activities/activitiesScreenStyles.ts`
- Modify related tests

Replace raw input and switch reconstructions with `Input`, `FormField`, and `KwiltSwitch` or a Canonical settings row. Preserve edit/create behavior. Make Save the sole dominant action, keep Cancel quiet, flatten the utility-action region, and route Delete through `AlertDialog`. Add regression coverage for save, cancel, duplicate, delete-cancel, and delete-confirm.

## Task 8: Storybook and real-runtime proof

Files:

- Add/update stories for DropdownMenu, Dialog, AlertDialog, and FormField
- Add evidence under `docs/delivery-evidence/ui/rnr-convergence/`

Render normal, long-content, disabled, error, destructive, keyboard, and large-text examples. Start Metro only from this worktree after confirming port 8081 ownership. Record checkout, branch, commit, dirty state, installed binary/build provenance, Metro port/path, route, device, and proof level. Capture reviewable screenshots and perform a fresh visual-critic pass against the RNR reference and nearest Kwilt surface.

## Task 9: Completion verification

Run:

```bash
npm run lint
npm run lint:tests
npm run architecture:lint
npm run product:lint
npm test -- --runInBand src/ui/DropdownMenu.test.tsx src/ui/Dialog.accessibility.test.tsx src/ui/AlertDialog.test.tsx src/ui/FormField.test.tsx
npm run verify:changed -- --run
git diff --check
```

Report source/test, Storybook, Simulator, assistive-technology, signed-device, and physical-device evidence separately. Do not call the convergence complete if the actual route cannot be rendered and operated.

## Approved extension: curated external product exemplars

Airbnb mobile listing detail is a task-scoped composition exemplar, not an
upstream component system, Kwilt precedent, theme, or production dependency.
RNR continues to inform generic native component anatomy and compound states;
Kwilt remains the binding authority for product behavior, page composition,
tokens, language, APIs, accessibility, and production implementation.

- Archive the five user-supplied screenshots with source, date, refresh trigger,
  usage boundary, and public provenance.
- Record a `Preserve / Translate / Reject` ledger before proposing local use.
- Add extracted ideas to the pattern atlas as Candidate patterns only.
- Require local components, licensed assets, Kwilt tokens, and real-runtime
  evidence before any candidate is accepted on a surface.
- Update the reductive and React Native UI skills so an external product
  exemplar cannot displace the current project's authority, the upstream
  component system, or a current-project accepted precedent.
- Pressure-test screenshot cloning, cross-project leakage, alternate component
  authorities, and premature Canonical promotion before completion.
