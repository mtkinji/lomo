# Drawer background — initial source audit

Date: 2026-09-28. Scope: background mechanics and exclusions for the first captured reference.\
Checkout: `/Users/andrewwatanabe/Kwilt`; branch `codex/onboarding-shoreline`; HEAD `59e8acff8831400a436407d463c58c10f5ff5f39`; substantial pre-existing staged/unstaged/untracked changes, including the pattern atlas.\
Evidence: source only. No runtime started, build installed, or app UI changed.\
Reference: [Origin focused drawer](../references/origin-mobile/drawer-background-2026-09/source.md).

## Findings

| ID / priority / disposition | Evidence and applicable rule | Recommended owner/action | Closure evidence |
| --- | --- | --- | --- |
| DRAWER-001 / design decision / candidate opportunity | `src/ui/BottomDrawer.tsx:1086` and `:1114` render animated colored scrims in the two keyboard layouts. No blur exists in this component. Current drawer guidance requires shared mechanics, not blur. | Evaluate focused-modal material in shared `BottomDrawer` and theme tokens. Define variant scope and fallback before rollout. This is not a violation of an existing blur requirement. | Accepted scope; before/after real route; platform/modal-host sampling; open/drag/close, keyboard, accessibility and fallback evidence. |
| DRAWER-002 / preserve / conforms in source | `src/ui/BottomGuide.tsx:133` explicitly distinguishes a nonblocking guide from a scrimmed modal; `:154` selects backdrop behavior. | Preserve nonblocking behavior. Classify guide jobs before applying any future material. | Runtime proof still absent; verify underlying interaction remains appropriate. |
| DRAWER-003 / migration review / unreviewed callers | `src/ui/BottomSheet.tsx:12` marks the wrapper deprecated; `:143` retains its own backdrop opacity. | Inventory live legacy callers before selecting migrations to `BottomDrawer`. Do not bulk-replace from the deprecation comment alone. | Caller/job ledger, behavior preservation, native route evidence after any migration. |
| DRAWER-004 / preserve / unreviewed composition | Drawer guidance requires one gutter owner and distinct semantic footer/action-dock jobs. This pass did not inspect every body/header/footer composition. | Next audit should inspect wrappers and raw modal sheets as well as shared drawer consumers. | Per-route spacing, footer selection, safe-area and scroll-clearance evidence. |

## Coverage and reproduction

Examined implementation owners: `BottomDrawer.tsx`, `BottomGuide.tsx`, `BottomSheet.tsx`; relevant constitution, inventory, atlas and drawer guidance. Source-search discovery found 96 files containing `<BottomDrawer` in `src/**/*.tsx`, including tests and wrapper names. This is a lexical search count, not 96 routes and not a reviewed consumer inventory.

Commands:

```sh
rg -l '<BottomDrawer' src --glob '*.tsx'
rg -n 'scrim|BlurView|hideBackdrop' src/ui/BottomDrawer.tsx src/ui/BottomGuide.tsx
rg -n 'Modal|backdrop|scrim' src/ui/BottomSheet.tsx
```

Reviewed runtime routes: 0. Enumerated app routes: not yet established. Individual callers, raw sheets, navigation drawers, platform-native dialogs and nested overlay combinations remain outside this source sample. No finding is closed as visually accepted.

Next bounded application: prototype the candidate in shared mechanics for one explicitly selected blocking drawer and compare it with a nonblocking guide. Existing user preference supplies the visual direction; specific scope, fallback and actual rendered result still need resolution. Do not interpret this audit as authorization to rewrite all overlays.
